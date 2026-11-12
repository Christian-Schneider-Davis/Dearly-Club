/**
 * The Dearly Chat — accounts and profiles.
 *
 *  saveProfile         create/update your profile (first save: 18+ and guidelines)
 *  refreshMembership   re-check whether your email has a paid membership
 *  deleteAccount       delete your account and profile for good
 *  syncTierOnMember    members/{id} changed → update matching accounts
 *  syncTierOnGift      gifts/{id} changed → update matching accounts
 *  adminSetSuspended   admin → pause or restore an account
 *
 * profiles/{uid}  public to other signed-in members: name, country, bio, interests, tier
 * users/{uid}     private: email, tier, consent records — only its owner and admins can read it
 * The tier ("free" or "member") is only ever written here, never by the browser.
 */
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { requireAdmin } from './admin.js'
import { eraseMessagesBy } from './chat.js'
import { cors, db } from './shared.js'
import { GUIDELINES_VERSION, tierFor, validateProfile } from './validate.js'

/** The caller, who must be signed in with a confirmed email and not suspended. */
async function requireMember(request) {
  const token = request.auth?.token
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  if (!token.email || !token.email_verified) {
    throw new HttpsError('failed-precondition', 'Please confirm your email address first — check your inbox for our link.')
  }
  const user = (await db.collection('users').doc(request.auth.uid).get()).data()
  if (user?.suspended) throw new HttpsError('permission-denied', 'This account is paused. Please contact us.')
  return { uid: request.auth.uid, email: token.email.toLowerCase(), user }
}

async function computeTier(email) {
  const [members, gifts] = await Promise.all([
    db.collection('members').where('email', '==', email).get(),
    db.collection('gifts').where('redeemedBy.email', '==', email).get(),
  ])
  return tierFor({ members: members.docs.map((d) => d.data()), gifts: gifts.docs.map((d) => d.data()) })
}

async function writeTier(uid, tier) {
  const batch = db.batch()
  batch.set(db.collection('users').doc(uid), { tier, tierCheckedAt: FieldValue.serverTimestamp() }, { merge: true })
  batch.set(db.collection('profiles').doc(uid), { tier }, { merge: true })
  await batch.commit()
}

export const saveProfile = onCall({ cors }, async (request) => {
  const { uid, email, user } = await requireMember(request)
  const isNew = !user?.createdAt
  const { value, errors } = validateProfile(request.data, isNew)
  if (Object.keys(errors).length) throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })

  const [tier, adminSnap] = await Promise.all([computeTier(email), db.collection('admins').doc(uid).get()])
  const now = FieldValue.serverTimestamp()
  const batch = db.batch()
  batch.set(
    db.collection('profiles').doc(uid),
    // host: Ariane (anyone in admins/) gets a "Host" badge in the chat.
    { ...value, tier, host: adminSnap.exists, ...(isNew ? { joinedAt: now } : {}), updatedAt: now },
    { merge: true },
  )
  batch.set(
    db.collection('users').doc(uid),
    {
      email,
      tier,
      tierCheckedAt: now,
      updatedAt: now,
      ...(isNew ? { createdAt: now, consent: { adult: true, guidelinesVersion: GUIDELINES_VERSION, at: now } } : {}),
    },
    { merge: true },
  )
  await batch.commit()
  return { tier }
})

export const refreshMembership = onCall({ cors }, async (request) => {
  const { uid, email, user } = await requireMember(request)
  if (!user?.createdAt) return { tier: 'free' }
  const tier = await computeTier(email)
  await writeTier(uid, tier)
  return { tier }
})

export const deleteAccount = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  if (request.data?.confirm !== 'DELETE') throw new HttpsError('invalid-argument', 'Type DELETE to confirm.')
  // Their chat messages are blanked (the conversation around them stays readable).
  await eraseMessagesBy(uid)
  await Promise.all([db.collection('profiles').doc(uid).delete(), db.collection('users').doc(uid).delete()])
  await getAuth().deleteUser(uid)
  logger.info('Account deleted', { uid })
  return { ok: true }
})

/** Re-check every account using one of these emails. */
async function syncEmails(emails) {
  for (const email of new Set(emails.filter(Boolean).map((e) => e.toLowerCase()))) {
    const users = await db.collection('users').where('email', '==', email).get()
    if (users.empty) continue
    const tier = await computeTier(email)
    await Promise.all(users.docs.filter((d) => d.data().tier !== tier).map((d) => writeTier(d.id, tier)))
  }
}

export const syncTierOnMember = onDocumentWritten('members/{id}', async (event) => {
  const before = event.data?.before?.data()
  const after = event.data?.after?.data()
  if (before?.status === after?.status && before?.email === after?.email) return
  await syncEmails([before?.email, after?.email])
})

export const syncTierOnGift = onDocumentWritten('gifts/{id}', async (event) => {
  const before = event.data?.before?.data()
  const after = event.data?.after?.data()
  const key = (g) => `${g?.status}|${g?.monthsRemaining}|${g?.lastLetterMonth}|${g?.redeemedBy?.email}`
  if (key(before) === key(after)) return
  await syncEmails([before?.redeemedBy?.email, after?.redeemedBy?.email])
})

export const adminSetSuspended = onCall({ cors }, async (request) => {
  await requireAdmin(request)
  const uid = String(request.data?.uid ?? '')
  const suspended = request.data?.suspended === true
  if (!uid) throw new HttpsError('invalid-argument', 'Missing account.')
  if (uid === request.auth.uid) throw new HttpsError('failed-precondition', 'You can’t pause your own account.')
  await getAuth().updateUser(uid, { disabled: suspended })
  if (suspended) await getAuth().revokeRefreshTokens(uid)
  const batch = db.batch()
  batch.set(db.collection('users').doc(uid), { suspended, suspendedAt: suspended ? FieldValue.serverTimestamp() : null }, { merge: true })
  batch.set(db.collection('profiles').doc(uid), { suspended }, { merge: true })
  await batch.commit()
  return { ok: true }
})
