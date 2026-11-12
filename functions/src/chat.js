/**
 * The Dearly Club group chat (and, in Phase 11, the members' rooms).
 *
 *  postMessage    send a message (rate-limited, checked server-side)
 *  deleteMessage  remove your own message (admins: any message)
 *  reportMessage  flag a message for Ariane; 3 different reports hide it until reviewed
 *  blockMember    hide someone's messages from you (they aren't told)
 *  adminModerate  admin: hide / restore a message, or close its reports
 *
 * rooms/{room}/messages/{id}  { uid, name, color, host, text, createdAt, deleted?, hidden?, reportCount }
 * reports/{room__id}          one per reported message: reasons, reporters, status
 * moderation/{room__id}       the original text of a hidden message (admins only)
 */
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { requireAdmin } from './admin.js'
import { cors, db } from './shared.js'
import { AUTO_HIDE_REPORTS, REPORT_REASONS, canUseRoom, validateChatMessage } from './validate.js'

const msgRef = (room, id) => db.collection('rooms').doc(room).collection('messages').doc(id)
const key = (room, id) => `${room}__${id}`

/** Signed-in, confirmed, has a profile, not paused. Returns uid + profile. */
async function requireProfile(request) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  if (!request.auth.token.email_verified) throw new HttpsError('failed-precondition', 'Please confirm your email address first.')
  const profile = (await db.collection('profiles').doc(uid).get()).data()
  if (!profile) throw new HttpsError('failed-precondition', 'Create your profile first.')
  if (profile.suspended) throw new HttpsError('permission-denied', 'This account is paused. Please contact us.')
  return { uid, profile }
}

/** Per-person posting limit: 8 a minute, 60 an hour. */
async function chatRateLimit(uid) {
  const ref = db.collection('rateLimits').doc(`chat_${uid}`)
  const now = new Date()
  const minute = now.toISOString().slice(0, 16)
  const hour = now.toISOString().slice(0, 13)
  await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {}
    const perMinute = d.minute === minute ? d.minuteCount : 0
    const perHour = d.hour === hour ? d.hourCount : 0
    if (perMinute >= 8) throw new HttpsError('resource-exhausted', 'Slow down a little — try again in a minute.')
    if (perHour >= 60) throw new HttpsError('resource-exhausted', 'You’ve sent a lot of messages this hour. Please take a break and come back later.')
    tx.set(ref, { minute, minuteCount: perMinute + 1, hour, hourCount: perHour + 1 })
  })
}

export const postMessage = onCall({ cors }, async (request) => {
  const { uid, profile } = await requireProfile(request)
  const { value, errors } = validateChatMessage(request.data)
  if (Object.keys(errors).length) throw new HttpsError('invalid-argument', Object.values(errors)[0], { fields: errors })
  if (!canUseRoom(value.room, profile.tier)) throw new HttpsError('permission-denied', 'This chat is for Dearly Members.')
  await chatRateLimit(uid)
  const ref = db.collection('rooms').doc(value.room).collection('messages').doc()
  await ref.set({
    uid,
    name: profile.displayName,
    color: profile.avatarColor ?? 'burgundy',
    host: profile.host === true,
    text: value.text,
    reportCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id: ref.id }
})

export const deleteMessage = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  const { room, id } = request.data ?? {}
  const ref = msgRef(String(room), String(id))
  const msg = (await ref.get()).data()
  if (!msg) throw new HttpsError('not-found', 'That message no longer exists.')
  if (msg.uid !== uid && !(await db.collection('admins').doc(uid).get()).exists) {
    throw new HttpsError('permission-denied', 'You can only delete your own messages.')
  }
  await ref.update({ deleted: true, text: '', deletedAt: FieldValue.serverTimestamp() })
  return { ok: true }
})

/** Hides a message: its text moves to moderation/ where only admins can read it. */
async function hide(tx, room, id, msg, why) {
  tx.set(db.collection('moderation').doc(key(room, id)), { room, id, uid: msg.uid, name: msg.name, text: msg.text, hiddenBecause: why, at: FieldValue.serverTimestamp() }, { merge: true })
  tx.update(msgRef(room, id), { hidden: true, text: '' })
}

export const reportMessage = onCall({ cors }, async (request) => {
  const { uid } = await requireProfile(request)
  const room = String(request.data?.room ?? '')
  const id = String(request.data?.id ?? '')
  const reason = REPORT_REASONS[request.data?.reason] ? request.data.reason : 'other'
  const note = typeof request.data?.note === 'string' ? request.data.note.trim().slice(0, 500) : ''

  await db.runTransaction(async (tx) => {
    const ref = msgRef(room, id)
    const msg = (await tx.get(ref)).data()
    if (!msg || msg.deleted) throw new HttpsError('not-found', 'That message no longer exists.')
    if (msg.uid === uid) throw new HttpsError('failed-precondition', 'You can’t report your own message.')
    const reportRef = db.collection('reports').doc(key(room, id))
    const report = (await tx.get(reportRef)).data()
    if (report?.reporters?.includes(uid)) return // already reported by this person
    const reporters = [...(report?.reporters ?? []), uid]
    tx.set(
      reportRef,
      {
        room,
        messageId: id,
        authorUid: msg.uid,
        authorName: msg.name,
        text: msg.text || report?.text || '',
        messageAt: msg.createdAt ?? null,
        reporters,
        count: reporters.length,
        reasons: FieldValue.arrayUnion({ reason, note, by: uid, at: new Date() }),
        status: 'open',
        updatedAt: FieldValue.serverTimestamp(),
        ...(report ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    )
    tx.update(ref, { reportCount: reporters.length })
    if (reporters.length >= AUTO_HIDE_REPORTS && !msg.hidden) await hide(tx, room, id, msg, 'reports')
  })
  return { ok: true }
})

export const blockMember = onCall({ cors }, async (request) => {
  const { uid } = await requireProfile(request)
  const other = String(request.data?.uid ?? '')
  if (!other || other === uid) throw new HttpsError('invalid-argument', 'Choose someone else.')
  await db
    .collection('users')
    .doc(uid)
    .set({ blocked: request.data?.block === false ? FieldValue.arrayRemove(other) : FieldValue.arrayUnion(other) }, { merge: true })
  return { ok: true }
})

export const adminModerate = onCall({ cors }, async (request) => {
  const adminUid = await requireAdmin(request)
  const room = String(request.data?.room ?? '')
  const id = String(request.data?.id ?? '')
  const action = request.data?.action
  if (!['hide', 'restore', 'dismiss'].includes(action)) throw new HttpsError('invalid-argument', 'Unknown action.')

  await db.runTransaction(async (tx) => {
    const ref = msgRef(room, id)
    const msg = (await tx.get(ref)).data()
    const modRef = db.collection('moderation').doc(key(room, id))
    const mod = (await tx.get(modRef)).data()
    const reportRef = db.collection('reports').doc(key(room, id))
    const report = (await tx.get(reportRef)).data()
    if (!msg) throw new HttpsError('not-found', 'That message no longer exists.')

    if (action === 'hide' && !msg.hidden && !msg.deleted) await hide(tx, room, id, msg, 'admin')
    if (action === 'restore' && msg.hidden && mod?.text) {
      tx.update(ref, { hidden: false, text: mod.text })
      tx.delete(modRef)
    }
    if (report) {
      tx.update(reportRef, {
        status: action === 'hide' ? 'actioned' : 'dismissed',
        resolvedBy: adminUid,
        resolvedAt: FieldValue.serverTimestamp(),
      })
    }
  })
  return { ok: true }
})

/** Used when an account is deleted: blank out everything they wrote. */
export async function eraseMessagesBy(uid) {
  const snap = await db.collectionGroup('messages').where('uid', '==', uid).get()
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch()
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { deleted: true, text: '', name: 'Former member', color: 'sand' }))
    await batch.commit()
  }
  return snap.size
}
