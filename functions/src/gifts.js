/**
 * Gift memberships.
 *
 *  createGiftCheckout  website → saves the gift, returns a Stripe Checkout link
 *  fulfilGiftPayment   (from the webhook) → gives the gift a unique code, emails buyer, sends card
 *  sendScheduledGifts  every morning → sends gift cards scheduled for today
 *  redeemGift          website → recipient adds their address; prepaid months begin
 *  monthlyGiftOrders   19th of each month (cutoff) → adds next month's letter to the shipping list
 */
import { randomInt } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { giftCardEmail, giftReceiptEmail, giftRedeemedEmail, queueEmail } from './emails.js'
import { STRIPE_SECRET_KEY, STRIPE_TAX_ENABLED, cors, db, priceByLookupKey, rateLimit, stripe } from './shared.js'
import { CODE_ALPHABET, GIFTS, TERMS_VERSION, letterMonth, parisDate, safeReturnBase, validateGift, validateRedeem } from './validate.js'

const gifts = db.collection('gifts')

function newCode() {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  const part = () => Array.from({ length: 4 }, pick).join('')
  return `DEAR-${part()}-${part()}`
}

/* ------------------------------------------------------------------ */
/* Buy                                                                 */
/* ------------------------------------------------------------------ */
export const createGiftCheckout = onCall({ secrets: [STRIPE_SECRET_KEY], cors }, async (request) => {
  const { value, errors } = validateGift(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }
  const base = safeReturnBase(request.data?.returnBase)
  if (!base) throw new HttpsError('invalid-argument', 'Unknown site address.')

  const price = await priceByLookupKey(GIFTS[value.months].lookupKey)
  const giftRef = gifts.doc()
  await giftRef.set({
    status: 'pending',
    months: value.months,
    buyer: value.buyer,
    recipient: value.recipient,
    message: value.message,
    sendOn: value.sendOn || null,
    consent: { terms: true, termsVersion: TERMS_VERSION, at: FieldValue.serverTimestamp(), ip: request.rawRequest?.ip ?? null },
    createdAt: FieldValue.serverTimestamp(),
  })

  const metadata = { giftId: giftRef.id, months: String(value.months) }
  const taxOn = STRIPE_TAX_ENABLED.value()
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [{ price: price.id, quantity: 1 }],
        customer_email: value.buyer.email,
        customer_creation: 'if_required',
        // Tax depends on where the buyer is, so ask for their billing address at payment.
        billing_address_collection: taxOn ? 'required' : 'auto',
        automatic_tax: { enabled: taxOn },
        metadata,
        payment_intent_data: { metadata, description: `Dearly Club gift — ${value.months} month${value.months === 1 ? '' : 's'}` },
        locale: 'auto',
        success_url: `${base}gift/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}gift?months=${value.months}&cancelled=1`,
      },
      { idempotencyKey: `gift-${giftRef.id}` },
    )
    await giftRef.update({ 'stripe.sessionId': session.id })
    return { url: session.url }
  } catch (err) {
    logger.error('Stripe gift session failed', { giftId: giftRef.id, message: err.message })
    await giftRef.update({ status: 'failed', error: err.message })
    throw new HttpsError('internal', 'We could not start the payment. Please try again in a moment.')
  }
})

/* ------------------------------------------------------------------ */
/* Paid (called by the Stripe webhook)                                 */
/* ------------------------------------------------------------------ */
export async function fulfilGiftPayment(session) {
  const giftRef = gifts.doc(session.metadata.giftId)

  const gift = await db.runTransaction(async (tx) => {
    const snap = await tx.get(giftRef)
    if (!snap.exists) throw new Error(`Gift ${giftRef.id} not found`)
    const current = snap.data()
    if (current.code) return null // already handled

    // Unique code: giftCodes/{code} works as the uniqueness index.
    let code
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = newCode()
      if (!(await tx.get(db.collection('giftCodes').doc(candidate))).exists) code = candidate
    }
    if (!code) throw new Error('Could not generate a unique gift code')

    tx.set(db.collection('giftCodes').doc(code), { giftId: giftRef.id, createdAt: FieldValue.serverTimestamp() })
    const update = {
      status: 'paid',
      code,
      paidAt: FieldValue.serverTimestamp(),
      amounts: {
        currency: session.currency,
        subtotal: session.amount_subtotal,
        tax: session.total_details?.amount_tax ?? 0,
        total: session.amount_total,
      },
      'stripe.paymentIntentId': session.payment_intent ?? null,
      'stripe.customerId': session.customer ?? null,
    }
    tx.update(giftRef, update)
    const full = { ...current, code, id: giftRef.id }
    queueEmail(giftReceiptEmail(full), tx)
    return full
  })

  if (gift && (!gift.sendOn || gift.sendOn <= parisDate())) await deliverGift(giftRef.id)
}

/** Email the gift card to the recipient (once). */
async function deliverGift(giftId) {
  const ref = gifts.doc(giftId)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const gift = snap.data()
    if (!gift || gift.status !== 'paid') return
    queueEmail(giftCardEmail(gift), tx)
    tx.update(ref, { status: 'sent', sentAt: FieldValue.serverTimestamp() })
  })
}

/** For the success page. */
export async function giftSummary(session) {
  const gift = (await gifts.doc(session.metadata.giftId).get()).data()
  return {
    type: 'gift',
    paid: session.payment_status === 'paid',
    months: gift?.months ?? Number(session.metadata.months),
    recipientName: gift?.recipient?.name ?? null,
    recipientEmail: gift?.recipient?.email ?? null,
    sendOn: gift?.sendOn ?? null,
    buyerEmail: gift?.buyer?.email ?? session.customer_details?.email ?? null,
    currency: session.currency,
    total: session.amount_total,
    tax: session.total_details?.amount_tax ?? 0,
  }
}

/* ------------------------------------------------------------------ */
/* Scheduled sends: 8:00 every morning, Paris time                     */
/* ------------------------------------------------------------------ */
export const sendScheduledGifts = onSchedule({ schedule: 'every day 08:00', timeZone: 'Europe/Paris' }, async () => {
  const due = await gifts.where('status', '==', 'paid').where('sendOn', '<=', parisDate()).get()
  for (const doc of due.docs) await deliverGift(doc.id)
  logger.info(`Scheduled gift cards sent: ${due.size}`)
})

/* ------------------------------------------------------------------ */
/* Redeem                                                              */
/* ------------------------------------------------------------------ */
export const redeemGift = onCall({ cors }, async (request) => {
  const { value, errors } = validateRedeem(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }
  await rateLimit(request.rawRequest?.ip, 'redeem', 10)

  const { code, customer, shipping } = value
  const result = await db.runTransaction(async (tx) => {
    const codeSnap = await tx.get(db.collection('giftCodes').doc(code))
    if (!codeSnap.exists) {
      throw new HttpsError('not-found', "We couldn't find that gift code. Please check it and try again.", {
        fields: { code: "We couldn't find that gift code." },
      })
    }
    const giftRef = gifts.doc(codeSnap.data().giftId)
    const gift = (await tx.get(giftRef)).data()
    if (gift.status === 'redeemed') {
      throw new HttpsError('already-exists', 'This gift has already been redeemed.', {
        fields: { code: 'This gift has already been redeemed.' },
      })
    }
    if (!['paid', 'sent'].includes(gift.status)) {
      throw new HttpsError('failed-precondition', 'This gift is not active yet.')
    }

    tx.update(giftRef, {
      status: 'redeemed',
      redeemedAt: FieldValue.serverTimestamp(),
      redeemedBy: customer,
      shipping,
      monthsRemaining: gift.months - 1,
      lastLetterMonth: letterMonth(),
    })
    // First month's letter goes straight onto the shipping list.
    tx.set(db.collection('orders').doc(`gift_${giftRef.id}_1`), {
      status: 'paid',
      type: 'gift',
      plan: 'gift',
      giftId: giftRef.id,
      giftMonth: 1,
      giftMonths: gift.months,
      letterMonth: letterMonth(),
      customer,
      shipping,
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    })
    queueEmail(giftRedeemedEmail({ customer, months: gift.months, shipping }), tx)
    return { firstName: customer.firstName, months: gift.months }
  })

  return result
})

/* ------------------------------------------------------------------ */
/* Monthly, on the 19th (cutoff) at 20:00: next month's letter for     */
/* every active gift membership, ready for the 20th–25th shipping run. */
/* ------------------------------------------------------------------ */
export const monthlyGiftOrders = onSchedule({ schedule: '0 20 19 * *', timeZone: 'Europe/Paris' }, async () => {
  const month = letterMonth()
  const active = await gifts.where('monthsRemaining', '>', 0).get()
  let created = 0
  for (const doc of active.docs) {
    await db.runTransaction(async (tx) => {
      const gift = (await tx.get(doc.ref)).data()
      if (!gift || gift.monthsRemaining <= 0 || (gift.lastLetterMonth ?? '') >= month) return
      const n = gift.months - gift.monthsRemaining + 1
      tx.set(db.collection('orders').doc(`gift_${doc.id}_${n}`), {
        status: 'paid',
        type: 'gift',
        plan: 'gift',
        giftId: doc.id,
        giftMonth: n,
        giftMonths: gift.months,
        letterMonth: month,
        customer: gift.redeemedBy,
        shipping: gift.shipping,
        createdAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
      })
      tx.update(doc.ref, { monthsRemaining: gift.monthsRemaining - 1, lastLetterMonth: month })
      created++
    })
  }
  logger.info(`Monthly gift orders created: ${created}`)
})
