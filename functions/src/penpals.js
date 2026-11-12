/**
 * Pen Pal Match & Chat (Dearly Members).
 *
 *  requestPenPal       join the waiting list with preferences; matched straight away if someone fits
 *  cancelPenPalRequest leave the waiting list
 *  endPenPal           end a match (the chat becomes read-only, addresses are removed)
 *  sharePenPalAddress  offer (or withdraw) your address; shown only once BOTH have offered
 *  matchWaitingPenPals hourly: pair anyone still waiting (catches simultaneous requests)
 *  adminMatchPenPals   admin: pair two waiting people by hand
 *
 * penpalRequests/{uid}             { status: waiting|matched|cancelled, languages, region, format, note, country }
 * penpals/{matchId}                { members: [a, b], people: {uid: {name, color, country}}, status, addressOffered: {uid: true}, addressesShared }
 * penpals/{matchId}/addresses/{uid} the address each person offered (readable by the pair once both offered)
 * penpals/{matchId}/messages/{id}  the private chat
 */
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { requireAdmin } from './admin.js'
import { penPalMatchedEmail, queueEmail } from './emails.js'
import { cors, db } from './shared.js'
import { penPalCompatible, validateAddress, validatePenPalRequest } from './validate.js'

const requests = db.collection('penpalRequests')
const matches = db.collection('penpals')

async function requireMemberProfile(request) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  if (!request.auth.token.email_verified) throw new HttpsError('failed-precondition', 'Please confirm your email address first.')
  const profile = (await db.collection('profiles').doc(uid).get()).data()
  if (!profile) throw new HttpsError('failed-precondition', 'Create your profile first.')
  if (profile.suspended) throw new HttpsError('permission-denied', 'This account is paused. Please contact us.')
  if (profile.tier !== 'member') throw new HttpsError('permission-denied', 'Pen Pal Match is for Dearly Members.')
  return { uid, profile }
}

/** A waiting request plus what matching needs to know about its owner. */
async function candidate(uid, req) {
  const user = (await db.collection('users').doc(uid).get()).data() ?? {}
  return { uid, ...req, blocked: user.blocked ?? [], partners: user.penpalPartners ?? [] }
}

/**
 * Try to pair `uid` with the longest-waiting compatible person.
 * Runs in a transaction so nobody is matched twice.
 */
export async function tryMatch(uid) {
  const waiting = await requests.where('status', '==', 'waiting').orderBy('createdAt').limit(200).get()
  const me = waiting.docs.find((d) => d.id === uid)
  if (!me) return null
  const meC = await candidate(uid, me.data())
  for (const other of waiting.docs) {
    if (other.id === uid) continue
    const otherC = await candidate(other.id, other.data())
    if (!penPalCompatible(meC, otherC)) continue

    const matchRef = matches.doc()
    const ok = await db.runTransaction(async (tx) => {
      const [a, b] = await Promise.all([tx.get(requests.doc(uid)), tx.get(requests.doc(other.id))])
      if (a.data()?.status !== 'waiting' || b.data()?.status !== 'waiting') return false
      const [pa, pb, ua, ub] = await Promise.all([
        tx.get(db.collection('profiles').doc(uid)),
        tx.get(db.collection('profiles').doc(other.id)),
        tx.get(db.collection('users').doc(uid)),
        tx.get(db.collection('users').doc(other.id)),
      ])
      const person = (p) => ({ name: p.data()?.displayName ?? 'Member', color: p.data()?.avatarColor ?? 'burgundy', country: p.data()?.country ?? '' })
      const shared = a.data().languages.filter((l) => b.data().languages.includes(l))
      tx.set(matchRef, {
        members: [uid, other.id],
        people: { [uid]: person(pa), [other.id]: person(pb) },
        languages: shared,
        format: a.data().format === 'both' ? b.data().format : a.data().format,
        status: 'active',
        addressOffered: {},
        addressesShared: false,
        createdAt: FieldValue.serverTimestamp(),
      })
      tx.update(requests.doc(uid), { status: 'matched', matchId: matchRef.id, matchedAt: FieldValue.serverTimestamp() })
      tx.update(requests.doc(other.id), { status: 'matched', matchId: matchRef.id, matchedAt: FieldValue.serverTimestamp() })
      tx.set(db.collection('users').doc(uid), { penpalPartners: FieldValue.arrayUnion(other.id) }, { merge: true })
      tx.set(db.collection('users').doc(other.id), { penpalPartners: FieldValue.arrayUnion(uid) }, { merge: true })
      for (const [u, p, partner] of [
        [ua, pa, pb],
        [ub, pb, pa],
      ]) {
        if (u.data()?.email) {
          queueEmail(penPalMatchedEmail({ to: u.data().email, firstName: p.data()?.displayName, partnerName: partner.data()?.displayName ?? 'a member', matchId: matchRef.id }), tx)
        }
      }
      return true
    })
    if (ok) return matchRef.id
  }
  return null
}

export const requestPenPal = onCall({ cors }, async (request) => {
  const { uid, profile } = await requireMemberProfile(request)
  const { value, errors } = validatePenPalRequest(request.data)
  if (Object.keys(errors).length) throw new HttpsError('invalid-argument', Object.values(errors)[0], { fields: errors })
  const active = await matches.where('members', 'array-contains', uid).where('status', '==', 'active').limit(1).get()
  if (!active.empty) throw new HttpsError('failed-precondition', 'You already have a pen pal. End that match first to find a new one.')

  await requests.doc(uid).set({
    ...value,
    status: 'waiting',
    country: profile.country ?? '',
    name: profile.displayName,
    createdAt: FieldValue.serverTimestamp(),
    matchId: null,
  })
  const matchId = await tryMatch(uid)
  return { matchId }
})

export const cancelPenPalRequest = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  const ref = requests.doc(uid)
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data()
    if (r?.status === 'waiting') tx.update(ref, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() })
  })
  return { ok: true }
})

async function endMatch(matchId, byUid) {
  const ref = matches.doc(matchId)
  const match = (await ref.get()).data()
  if (!match) throw new HttpsError('not-found', 'That pen-pal match doesn’t exist.')
  if (byUid && !match.members.includes(byUid)) throw new HttpsError('permission-denied', 'This isn’t your pen-pal match.')
  const addresses = await ref.collection('addresses').get()
  const batch = db.batch()
  addresses.forEach((d) => batch.delete(d.ref))
  batch.update(ref, { status: 'ended', endedBy: byUid ?? 'admin', endedAt: FieldValue.serverTimestamp(), addressesShared: false, addressOffered: {} })
  await batch.commit()
}

export const endPenPal = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  await endMatch(String(request.data?.matchId ?? ''), uid)
  return { ok: true }
})

export const sharePenPalAddress = onCall({ cors }, async (request) => {
  const { uid } = await requireMemberProfile(request)
  const matchId = String(request.data?.matchId ?? '')
  const ref = matches.doc(matchId)
  const withdraw = request.data?.withdraw === true
  let value = null
  if (!withdraw) {
    if (request.data?.consent !== true) throw new HttpsError('invalid-argument', 'Please confirm you want to share your address.')
    const checked = validateAddress(request.data?.address)
    if (Object.keys(checked.errors).length) throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: checked.errors })
    value = checked.value
  }

  return db.runTransaction(async (tx) => {
    const match = (await tx.get(ref)).data()
    if (!match?.members?.includes(uid)) throw new HttpsError('permission-denied', 'This isn’t your pen-pal match.')
    if (match.status !== 'active') throw new HttpsError('failed-precondition', 'This pen-pal match has ended.')
    const offered = { ...(match.addressOffered ?? {}) }
    if (withdraw) {
      delete offered[uid]
      tx.delete(ref.collection('addresses').doc(uid))
    } else {
      offered[uid] = true
      tx.set(ref.collection('addresses').doc(uid), { ...value, sharedAt: FieldValue.serverTimestamp() })
    }
    const both = match.members.every((m) => offered[m])
    tx.update(ref, { addressOffered: offered, addressesShared: both })
    return { addressesShared: both }
  })
})

export const matchWaitingPenPals = onSchedule({ schedule: 'every 60 minutes', timeZone: 'Europe/Paris' }, async () => {
  const waiting = await requests.where('status', '==', 'waiting').orderBy('createdAt').limit(200).get()
  let made = 0
  for (const d of waiting.docs) {
    const current = (await requests.doc(d.id).get()).data()
    if (current?.status === 'waiting' && (await tryMatch(d.id))) made++
  }
  if (made) logger.info('Pen pals matched', { made })
})

export const adminMatchPenPals = onCall({ cors }, async (request) => {
  await requireAdmin(request)
  const [a, b] = Array.isArray(request.data?.uids) ? request.data.uids.map(String) : []
  if (!a || !b || a === b) throw new HttpsError('invalid-argument', 'Choose two different people.')
  const [ra, rb] = await Promise.all([requests.doc(a).get(), requests.doc(b).get()])
  if (ra.data()?.status !== 'waiting' || rb.data()?.status !== 'waiting') throw new HttpsError('failed-precondition', 'Both people must be waiting.')
  const ca = await candidate(a, ra.data())
  const cb = await candidate(b, rb.data())
  if ((ca.blocked ?? []).includes(b) || (cb.blocked ?? []).includes(a)) throw new HttpsError('failed-precondition', 'One of them has blocked the other.')
  // Admin matching overrides language/region/format preferences, but never blocks.
  return { matchId: await tryMatchPair(a, b) }
})

/** Pair two specific waiting people (admin), ignoring preferences. */
async function tryMatchPair(a, b) {
  const matchRef = matches.doc()
  await db.runTransaction(async (tx) => {
    const [ra, rb, pa, pb, ua, ub] = await Promise.all([
      tx.get(requests.doc(a)),
      tx.get(requests.doc(b)),
      tx.get(db.collection('profiles').doc(a)),
      tx.get(db.collection('profiles').doc(b)),
      tx.get(db.collection('users').doc(a)),
      tx.get(db.collection('users').doc(b)),
    ])
    if (ra.data()?.status !== 'waiting' || rb.data()?.status !== 'waiting') throw new HttpsError('failed-precondition', 'Both people must still be waiting.')
    const person = (p) => ({ name: p.data()?.displayName ?? 'Member', color: p.data()?.avatarColor ?? 'burgundy', country: p.data()?.country ?? '' })
    tx.set(matchRef, {
      members: [a, b],
      people: { [a]: person(pa), [b]: person(pb) },
      languages: ra.data().languages.filter((l) => rb.data().languages.includes(l)),
      format: ra.data().format === 'both' ? rb.data().format : ra.data().format,
      status: 'active',
      addressOffered: {},
      addressesShared: false,
      matchedBy: 'admin',
      createdAt: FieldValue.serverTimestamp(),
    })
    for (const [r] of [[ra], [rb]]) tx.update(r.ref, { status: 'matched', matchId: matchRef.id, matchedAt: FieldValue.serverTimestamp() })
    tx.set(ua.ref, { penpalPartners: FieldValue.arrayUnion(b) }, { merge: true })
    tx.set(ub.ref, { penpalPartners: FieldValue.arrayUnion(a) }, { merge: true })
    for (const [u, p, partner] of [
      [ua, pa, pb],
      [ub, pb, pa],
    ]) {
      if (u.data()?.email) queueEmail(penPalMatchedEmail({ to: u.data().email, firstName: p.data()?.displayName, partnerName: partner.data()?.displayName ?? 'a member', matchId: matchRef.id }), tx)
    }
  })
  return matchRef.id
}

export const adminEndPenPal = onCall({ cors }, async (request) => {
  await requireAdmin(request)
  await endMatch(String(request.data?.matchId ?? ''), null)
  return { ok: true }
})

/** Account deletion: leave the waiting list and end any matches. */
export async function cleanUpPenPals(uid) {
  await requests.doc(uid).delete()
  const mine = await matches.where('members', 'array-contains', uid).get()
  for (const m of mine.docs) if (m.data().status === 'active') await endMatch(m.id, uid)
}
