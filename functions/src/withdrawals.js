/**
 * EU right of withdrawal: the "Withdraw from contract here" function.
 * Saves the statement with the time we received it, emails the customer an
 * acknowledgement (content + date/time), and notifies Ariane.
 */
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { queueEmail, withdrawalNoticeEmail, withdrawalReceiptEmail } from './emails.js'
import { ADMIN_EMAIL, cors, db, rateLimit } from './shared.js'
import { WITHDRAW_SUBJECTS, validateWithdrawal } from './validate.js'

export const submitWithdrawal = onCall({ cors }, async (request) => {
  const { value, errors } = validateWithdrawal(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }
  await rateLimit(request.rawRequest?.ip, 'withdraw', 5)

  const now = new Date()
  const label = WITHDRAW_SUBJECTS[value.subject]
  const ref = db.collection('withdrawals').doc()
  const batch = db.batch()
  batch.set(ref, { ...value, subjectLabel: label, status: 'received', receivedAt: now, createdAt: FieldValue.serverTimestamp() })
  batch.set(db.collection('mail').doc(), { ...withdrawalReceiptEmail(value, label, now), createdAt: FieldValue.serverTimestamp() })
  if (ADMIN_EMAIL.value()) {
    batch.set(db.collection('mail').doc(), { ...withdrawalNoticeEmail(value, label, now, ADMIN_EMAIL.value()), createdAt: FieldValue.serverTimestamp() })
  }
  await batch.commit()

  return { id: ref.id, receivedAt: now.toISOString() }
})
