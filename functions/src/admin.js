/**
 * Admin + contact functions.
 *
 *  submitContact    public contact form → messages/ + email to Ariane
 *  adminSendEmail   admin → email a group of members (one private email each)
 *  adminResendGift  admin → send a gift card email again
 *
 * Who is an admin: anyone with a document at admins/{their user id}
 * (created by hand in the Firebase console — see README).
 */
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { contactNoticeEmail, giftCardEmail, memberMessageEmail, queueEmail } from './emails.js'
import { ADMIN_EMAIL, cors, db, rateLimit, siteUrl } from './shared.js'
import { validateBroadcast, validateContact } from './validate.js'

export async function requireAdmin(request) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in.')
  const snap = await db.collection('admins').doc(uid).get()
  if (!snap.exists) throw new HttpsError('permission-denied', 'This account is not an admin.')
  return uid
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */
export const submitContact = onCall({ cors }, async (request) => {
  // Hidden "website" field: only bots fill it. Pretend success, store nothing.
  if (request.data?.website) return { ok: true }
  const { value, errors } = validateContact(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }
  await rateLimit(request.rawRequest?.ip, 'contact', 5)

  const batch = db.batch()
  const ref = db.collection('messages').doc()
  batch.set(ref, { ...value, status: 'new', createdAt: FieldValue.serverTimestamp() })
  if (ADMIN_EMAIL.value()) {
    batch.set(db.collection('mail').doc(), { ...contactNoticeEmail(value, ADMIN_EMAIL.value()), createdAt: FieldValue.serverTimestamp() })
  }
  await batch.commit()
  return { ok: true }
})

/* ------------------------------------------------------------------ */
/* Email members                                                       */
/* ------------------------------------------------------------------ */
const MAX_RECIPIENTS = 2000

async function audienceEmails(audience, single) {
  const emails = new Map() // email → { firstName, unsubscribeUrl? }
  const add = (email, firstName, extra = {}) => {
    const e = String(email ?? '').trim().toLowerCase()
    if (e && !emails.has(e)) emails.set(e, { firstName: firstName ?? '', ...extra })
  }

  if (audience === 'single') {
    add(single, '')
    return emails
  }
  if (audience === 'newsletter') {
    ;(await db.collection('subscribers').where('status', '==', 'subscribed').get()).forEach((d) => {
      const s = d.data()
      add(s.email, s.firstName, { unsubscribeUrl: siteUrl(`newsletter/unsubscribe?token=${s.token}`) })
    })
    return emails
  }
  if (audience === 'active' || audience === 'all') {
    const q = audience === 'active' ? db.collection('members').where('status', '==', 'active') : db.collection('members')
    ;(await q.get()).forEach((d) => add(d.data().email, d.data().firstName))
  }
  if (audience === 'gift' || audience === 'all') {
    ;(await db.collection('gifts').where('status', '==', 'redeemed').get()).forEach((d) => {
      const g = d.data()
      if (audience === 'all' || (g.monthsRemaining ?? 0) > 0) add(g.redeemedBy?.email, g.redeemedBy?.firstName)
    })
  }
  return emails
}

export const adminSendEmail = onCall({ cors }, async (request) => {
  const uid = await requireAdmin(request)
  const { value, errors } = validateBroadcast(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }

  const recipients = await audienceEmails(value.audience, value.email)
  if (recipients.size === 0) throw new HttpsError('failed-precondition', 'No one matches that audience yet.')
  if (recipients.size > MAX_RECIPIENTS) throw new HttpsError('failed-precondition', `Too many recipients (${recipients.size}).`)
  if (value.dryRun) return { count: recipients.size }

  const campaign = db.collection('campaigns').doc()
  const entries = [...recipients]
  // Firestore batches hold up to 500 writes.
  for (let i = 0; i < entries.length; i += 450) {
    const batch = db.batch()
    for (const [email, { firstName, unsubscribeUrl }] of entries.slice(i, i + 450)) {
      batch.set(db.collection('mail').doc(), {
        ...memberMessageEmail({ to: email, firstName, subject: value.subject, body: value.body, unsubscribeUrl }),
        campaignId: campaign.id,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
  }
  await campaign.set({
    audience: value.audience,
    subject: value.subject,
    body: value.body,
    count: entries.length,
    sentBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { count: entries.length }
})

/* ------------------------------------------------------------------ */
/* Resend a gift card                                                  */
/* ------------------------------------------------------------------ */
export const adminResendGift = onCall({ cors }, async (request) => {
  await requireAdmin(request)
  const giftId = String(request.data?.giftId ?? '')
  const ref = db.collection('gifts').doc(giftId)
  const gift = giftId ? (await ref.get()).data() : null
  if (!gift?.code) throw new HttpsError('failed-precondition', 'This gift has not been paid yet.')
  if (gift.status === 'redeemed') throw new HttpsError('failed-precondition', 'This gift has already been redeemed.')
  await queueEmail(giftCardEmail(gift))
  await ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp(), resentCount: FieldValue.increment(1) })
  return { ok: true }
})
