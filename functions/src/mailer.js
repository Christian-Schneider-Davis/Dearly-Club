/**
 * Sends every email the site queues in the `mail` collection, through Brevo.
 * (Replaces the "Trigger Email from Firestore" extension, which Firebase is
 * retiring on 31 March 2027. Same document format, so nothing else changes.)
 *
 *   mail/{id}  { to, replyTo?, message: { subject, text, html, headers? } }
 *   → adds    delivery: { state: PROCESSING | SUCCESS | ERROR, attempts, error?, messageId?, endTime }
 *
 * Settings: BREVO_SMTP_LOGIN (functions/.env) and the secret BREVO_SMTP_KEY
 * (`firebase functions:secrets:set BREVO_SMTP_KEY`).
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import nodemailer from 'nodemailer'
import { db } from './shared.js'

export const BREVO_SMTP_KEY = defineSecret('BREVO_SMTP_KEY')
export const BREVO_SMTP_LOGIN = defineString('BREVO_SMTP_LOGIN', { description: 'Brevo → SMTP & API → SMTP → "SMTP login"' })
export const MAIL_FROM = defineString('MAIL_FROM', { default: 'Dearly Club <hello@dearlyclub.eu>' })
export const MAIL_REPLY_TO = defineString('MAIL_REPLY_TO', { default: 'hello@dearlyclub.eu' })

const MAX_ATTEMPTS = 4
let transport = null
const smtp = () =>
  (transport ??= nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // upgraded with STARTTLS
    requireTLS: true,
    pool: true,
    maxConnections: 3,
    auth: { user: BREVO_SMTP_LOGIN.value(), pass: BREVO_SMTP_KEY.value() },
  }))

/** Claims a mail document (so it's never sent twice), sends it, records the result. */
export async function deliver(ref) {
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const mail = snap.data()
    const d = mail?.delivery
    if (!mail || d?.state === 'SUCCESS' || d?.state === 'PROCESSING' || (d?.attempts ?? 0) >= MAX_ATTEMPTS) return null
    tx.update(ref, { 'delivery.state': 'PROCESSING', 'delivery.attempts': (d?.attempts ?? 0) + 1, 'delivery.startTime': FieldValue.serverTimestamp() })
    return mail
  })
  if (!claimed) return

  const { to, cc, bcc, replyTo, message = {} } = claimed
  try {
    if (!to || !message.subject || !(message.html || message.text)) throw new Error('Missing to, subject or body.')
    const info = await smtp().sendMail({
      from: claimed.from ?? MAIL_FROM.value(),
      replyTo: replyTo ?? MAIL_REPLY_TO.value(),
      to,
      cc,
      bcc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: message.headers,
      attachments: message.attachments,
    })
    await ref.update({ 'delivery.state': 'SUCCESS', 'delivery.messageId': info.messageId ?? null, 'delivery.error': null, 'delivery.endTime': FieldValue.serverTimestamp() })
  } catch (err) {
    logger.error('Email not sent', { id: ref.id, to, error: err.message })
    await ref.update({ 'delivery.state': 'ERROR', 'delivery.error': String(err.message).slice(0, 500), 'delivery.endTime': FieldValue.serverTimestamp() })
  }
}

export const sendQueuedEmail = onDocumentCreated({ document: 'mail/{id}', secrets: [BREVO_SMTP_KEY] }, (event) => event.data && deliver(event.data.ref))

/** Every 30 minutes: retry emails that failed (e.g. Brevo's daily limit), up to 4 attempts. */
export const retryFailedEmails = onSchedule({ schedule: 'every 30 minutes', timeZone: 'Europe/Paris', secrets: [BREVO_SMTP_KEY] }, async () => {
  const failed = await db.collection('mail').where('delivery.state', '==', 'ERROR').limit(100).get()
  // A send interrupted mid-way (function crash) is stuck in PROCESSING; retry those after 15 minutes.
  const stuck = await db
    .collection('mail')
    .where('delivery.state', '==', 'PROCESSING')
    .where('delivery.startTime', '<', Timestamp.fromMillis(Date.now() - 15 * 60000))
    .limit(100)
    .get()
  for (const d of stuck.docs) await d.ref.update({ 'delivery.state': 'ERROR', 'delivery.error': 'Interrupted; retrying.' })
  for (const d of [...failed.docs, ...stuck.docs]) {
    if ((d.data().delivery?.attempts ?? 0) < MAX_ATTEMPTS) await deliver(d.ref)
  }
})
