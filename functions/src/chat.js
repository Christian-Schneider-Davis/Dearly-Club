/**
 * The Dearly Club group chat (and, in Phase 11, the members' rooms).
 *
 *  postMessage    send a message (rate-limited, checked server-side)
 *  deleteMessage  remove your own message (admins: any message)
 *  reportMessage  flag a message for Ariane; 3 different reports hide it until reviewed
 *  blockMember    hide someone's messages from you (they aren't told)
 *  adminModerate  admin: hide / restore a message, or close its reports
 *
 * rooms/{room}/messages/{id}  { uid, name, color, host, text, image?, createdAt, deleted?, hidden?, reportCount }
 *   image: { url, path, width, height }: a photo in Cloud Storage at chat/<room>/<id>.jpg.
 *   The browser uploads it to chat-uploads/<uid>/ first (storage.rules); postMessage moves it.
 * reports/{room__id}          one per reported message: reasons, reporters, status
 * moderation/{room__id}       the original text of a hidden message (admins only)
 */
import { FieldValue } from 'firebase-admin/firestore'
import { getDownloadURL, getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { requireAdmin } from './admin.js'
import { cors, db } from './shared.js'
import { AUTO_HIDE_REPORTS, PHOTO_MAX_BYTES, REPORT_REASONS, canUseRoom, isPenPalRoom, messagesPath, validateChatMessage } from './validate.js'

const messages = (room) => {
  const [a, b, c] = messagesPath(room)
  return db.collection(a).doc(b).collection(c)
}
const msgRef = (room, id) => messages(room).doc(id)
const key = (room, id) => `${room}__${id}`

const bucketName = () => JSON.parse(process.env.FIREBASE_CONFIG || '{}').storageBucket || `${process.env.GCLOUD_PROJECT}.firebasestorage.app`
const bucket = () => getStorage().bucket(bucketName())
/** Removes a chat photo from storage (no error if it's already gone). */
const deletePhoto = (image) => (image?.path ? bucket().file(image.path).delete({ ignoreNotFound: true }).catch((e) => console.error('photo delete', e)) : null)

/** Checks an uploaded photo and moves it next to its message. Returns the stored image. */
async function attachPhoto(image, room, id) {
  const upload = bucket().file(image.path)
  const [exists] = await upload.exists()
  if (!exists) throw new HttpsError('invalid-argument', 'That photo didn’t upload properly. Please try again.')
  const [meta] = await upload.getMetadata()
  if (meta.contentType !== 'image/jpeg' || Number(meta.size) > PHOTO_MAX_BYTES) {
    await upload.delete({ ignoreNotFound: true })
    throw new HttpsError('invalid-argument', 'Please choose a photo (JPEG, PNG or HEIC) under 5 MB.')
  }
  const dest = bucket().file(`chat/${room}/${id}.jpg`)
  await upload.move(dest)
  return { url: await getDownloadURL(dest), path: dest.name, width: image.width, height: image.height }
}

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
  const { value, errors } = validateChatMessage(request.data, uid)
  if (Object.keys(errors).length) throw new HttpsError('invalid-argument', Object.values(errors)[0], { fields: errors })
  if (isPenPalRoom(value.room)) {
    const match = (await db.collection('penpals').doc(value.room.slice(3)).get()).data()
    if (!match?.members?.includes(uid)) throw new HttpsError('permission-denied', 'This isn’t your pen-pal chat.')
    if (match.status !== 'active') throw new HttpsError('failed-precondition', 'This pen-pal match has ended.')
    if (profile.tier !== 'member') throw new HttpsError('permission-denied', 'Pen Pal Match is for Dearly Members.')
  } else if (!canUseRoom(value.room, profile.tier)) {
    throw new HttpsError('permission-denied', 'This chat is for Dearly Members.')
  }
  await chatRateLimit(uid)
  const ref = messages(value.room).doc()
  const image = value.image ? await attachPhoto(value.image, value.room, ref.id) : null
  await ref.set({
    uid,
    name: profile.displayName,
    color: profile.avatarColor ?? 'burgundy',
    host: profile.host === true,
    member: profile.tier === 'member',
    text: value.text,
    ...(image ? { image } : {}),
    reportCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id: ref.id }
})

export const deleteMessage = onCall({ cors }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  const { room, id } = request.data ?? {}
  if (!room || !id) throw new HttpsError('invalid-argument', 'Missing message.')
  const ref = msgRef(String(room), String(id))
  const msg = (await ref.get()).data()
  if (!msg) throw new HttpsError('not-found', 'That message no longer exists.')
  const isAdmin = (await db.collection('admins').doc(uid).get()).exists
  if (msg.uid !== uid && !isAdmin) throw new HttpsError('permission-denied', 'You can only delete your own messages.')
  await ref.update({ deleted: true, text: '', image: FieldValue.delete(), deletedAt: FieldValue.serverTimestamp(), ...(msg.uid !== uid ? { deletedBy: 'host' } : {}) })
  await deletePhoto(msg.image)
  // Erase every copy: the hidden original (moderation/) and the copy kept with any report.
  const modRef = db.collection('moderation').doc(key(String(room), String(id)))
  await modRef.get().then((d) => (d.exists ? Promise.all([deletePhoto(d.data().image), modRef.delete()]) : null))
  const reportRef = db.collection('reports').doc(key(String(room), String(id)))
  if ((await reportRef.get()).exists) {
    await reportRef.update({ text: '', image: null, status: 'actioned', resolvedBy: isAdmin ? uid : 'author', resolvedAt: FieldValue.serverTimestamp() })
  }
  return { ok: true }
})

/** Hides a message: its text (and photo) move to moderation/ where only admins can read them. */
async function hide(tx, room, id, msg, why) {
  tx.set(
    db.collection('moderation').doc(key(room, id)),
    { room, id, uid: msg.uid, name: msg.name, text: msg.text, image: msg.image ?? null, hiddenBecause: why, at: FieldValue.serverTimestamp() },
    { merge: true },
  )
  tx.update(msgRef(room, id), { hidden: true, text: '', image: FieldValue.delete() })
}

export const reportMessage = onCall({ cors }, async (request) => {
  const { uid } = await requireProfile(request)
  const room = String(request.data?.room ?? '')
  const id = String(request.data?.id ?? '')
  const reason = REPORT_REASONS[request.data?.reason] ? request.data.reason : 'other'
  const note = typeof request.data?.note === 'string' ? request.data.note.trim().slice(0, 500) : ''

  if (!room || !id || (!isPenPalRoom(room) && !canUseRoom(room, 'member'))) throw new HttpsError('invalid-argument', 'Unknown message.')
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
        image: msg.image ?? report?.image ?? null,
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
  if (!room || !id) throw new HttpsError('invalid-argument', 'Missing message.')

  await db.runTransaction(async (tx) => {
    const ref = msgRef(room, id)
    const msg = (await tx.get(ref)).data()
    const modRef = db.collection('moderation').doc(key(room, id))
    const mod = (await tx.get(modRef)).data()
    const reportRef = db.collection('reports').doc(key(room, id))
    const report = (await tx.get(reportRef)).data()
    if (!msg) throw new HttpsError('not-found', 'That message no longer exists.')

    if (action === 'hide' && !msg.hidden && !msg.deleted) await hide(tx, room, id, msg, 'admin')
    if (action === 'restore' && msg.hidden && (mod?.text || mod?.image)) {
      tx.update(ref, { hidden: false, text: mod.text ?? '', ...(mod.image ? { image: mod.image } : {}) })
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
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { deleted: true, text: '', image: FieldValue.delete(), name: 'Former member', color: 'sand' }))
    await batch.commit()
  }
  await Promise.all(snap.docs.map((d) => deletePhoto(d.data().image)))
  const hidden = await db.collection('moderation').where('uid', '==', uid).get()
  await Promise.all(hidden.docs.map((d) => deletePhoto(d.data().image)))
  await bucket().deleteFiles({ prefix: `chat-uploads/${uid}/` }).catch(() => {})
  return snap.size
}

/** Photos uploaded but never sent (the person closed the page) are removed after a day. */
export const cleanUpChatUploads = onSchedule({ schedule: 'every day 04:00', timeZone: 'Europe/Paris' }, async () => {
  const [files] = await bucket().getFiles({ prefix: 'chat-uploads/' })
  const cutoff = Date.now() - 24 * 3600 * 1000
  const stale = files.filter((f) => new Date(f.metadata.timeCreated).getTime() < cutoff)
  await Promise.all(stale.map((f) => f.delete({ ignoreNotFound: true })))
  console.log(`Removed ${stale.length} unsent chat photo(s).`)
})
