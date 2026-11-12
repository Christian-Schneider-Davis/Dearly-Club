/**
 * Mailing list (replaces the Wix newsletter).
 *
 *  subscribeNewsletter      website form → "please confirm" email (double opt-in)
 *  confirmNewsletter        link in that email → subscribed
 *  unsubscribeNewsletter    link in every newsletter → unsubscribed
 *  adminImportSubscribers   admin → bring over the Wix list (already opted in there)
 *
 * subscribers/{sha256(email)} — one document per address, so nobody is added twice.
 */
import { createHash, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { requireAdmin } from './admin.js'
import { newsletterConfirmEmail } from './emails.js'
import { cors, db, rateLimit, siteUrl } from './shared.js'
import { cleanImport, validateSubscribe } from './validate.js'

const subscribers = db.collection('subscribers')
export const subscriberId = (email) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 40)
const newToken = () => randomBytes(24).toString('base64url')
export const unsubscribeUrl = (token) => siteUrl(`newsletter/unsubscribe?token=${token}`)
const CONSENT_TEXT = 'I want to subscribe to your mailing list.'

export const subscribeNewsletter = onCall({ cors }, async (request) => {
  if (request.data?.website) return { ok: true } // honeypot
  const { value, errors } = validateSubscribe(request.data)
  if (Object.keys(errors).length) throw new HttpsError('invalid-argument', Object.values(errors)[0], { fields: errors })
  await rateLimit(request.rawRequest?.ip, 'newsletter', 5)

  const ref = subscribers.doc(subscriberId(value.email))
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data()
    // Already on the list: say nothing different, so the form never reveals who is subscribed.
    if (current?.status === 'subscribed') return
    const token = current?.token ?? newToken()
    tx.set(
      ref,
      {
        email: value.email,
        status: 'pending',
        source: current?.source ?? 'website',
        token,
        consent: { text: CONSENT_TEXT, at: FieldValue.serverTimestamp() },
        createdAt: current?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    tx.set(db.collection('mail').doc(), {
      ...newsletterConfirmEmail({ to: value.email, confirmUrl: siteUrl(`newsletter/confirm?token=${token}`) }),
      createdAt: FieldValue.serverTimestamp(),
    })
  })
  return { ok: true }
})

async function byToken(token) {
  const t = String(token ?? '')
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) throw new HttpsError('not-found', 'This link is not valid. It may be incomplete.')
  const snap = await subscribers.where('token', '==', t).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'This link is not valid. It may be incomplete.')
  return snap.docs[0]
}

export const confirmNewsletter = onCall({ cors }, async (request) => {
  const doc = await byToken(request.data?.token)
  if (doc.data().status !== 'subscribed') {
    await doc.ref.update({ status: 'subscribed', confirmedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  }
  return { ok: true }
})

export const unsubscribeNewsletter = onCall({ cors }, async (request) => {
  const doc = await byToken(request.data?.token)
  if (doc.data().status !== 'unsubscribed') {
    await doc.ref.update({ status: 'unsubscribed', unsubscribedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  }
  return { ok: true }
})

export const adminImportSubscribers = onCall({ cors }, async (request) => {
  await requireAdmin(request)
  if (request.data?.confirmedOptIn !== true) {
    throw new HttpsError('failed-precondition', 'Only import people who signed up for the newsletter.')
  }
  const { rows, skipped } = cleanImport(request.data?.rows)
  if (!rows.length) throw new HttpsError('invalid-argument', 'No valid email addresses found in that file.')

  let added = 0
  let kept = 0
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400)
    const refs = chunk.map((r) => subscribers.doc(subscriberId(r.email)))
    const snaps = await db.getAll(...refs)
    const batch = db.batch()
    snaps.forEach((snap, j) => {
      // Never re-subscribe someone who unsubscribed, and leave existing subscribers as they are.
      if (snap.exists) {
        kept++
        return
      }
      added++
      batch.set(refs[j], {
        email: chunk[j].email,
        firstName: chunk[j].firstName || null,
        status: 'subscribed',
        source: 'wix-import',
        token: newToken(),
        consent: { text: 'Subscribed on the previous Wix site', importedAt: FieldValue.serverTimestamp() },
        createdAt: FieldValue.serverTimestamp(),
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
    await batch.commit()
  }
  return { added, alreadyOnList: kept, skipped }
})
