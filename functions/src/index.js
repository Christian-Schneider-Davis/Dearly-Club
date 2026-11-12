/**
 * Dearly Club — Cloud Functions (region europe-west1, next to the database).
 *
 *  createCheckoutSession  website → saves the order + address, returns a Stripe Checkout link
 *  getCheckoutSummary     website success page → shows what was ordered
 *  stripeWebhook          Stripe → marks orders paid, tracks members, logs monthly renewals
 *  (gifts)                see gifts.js: createGiftCheckout, redeemGift, sendScheduledGifts, monthlyGiftOrders
 *
 * Secrets (never in code): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 */
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import {
  STRIPE_SECRET_KEY,
  STRIPE_TAX_ENABLED,
  STRIPE_WEBHOOK_SECRET,
  cors,
  db,
  priceByLookupKey,
  stripe,
  toStripeAddress,
} from './shared.js'
import { PLANS, TERMS_VERSION, letterMonth, safeReturnBase, validateCheckout } from './validate.js'
import { fulfilGiftPayment, giftSummary } from './gifts.js'
import { orderConfirmationEmail, queueEmail } from './emails.js'

export { createGiftCheckout, redeemGift, sendScheduledGifts, monthlyGiftOrders } from './gifts.js'
export { submitWithdrawal } from './withdrawals.js'
export { submitContact, adminSendEmail, adminResendGift } from './admin.js'
export { subscribeNewsletter, confirmNewsletter, unsubscribeNewsletter, adminImportSubscribers } from './newsletter.js'
export { saveProfile, refreshMembership, deleteAccount, syncTierOnMember, syncTierOnGift, adminSetSuspended } from './community.js'
export { postMessage, deleteMessage, reportMessage, blockMember, adminModerate } from './chat.js'
export { requestPenPal, cancelPenPalRequest, endPenPal, sharePenPalAddress, matchWaitingPenPals, adminMatchPenPals, adminEndPenPal } from './penpals.js'

/* ------------------------------------------------------------------ */
/* 1. Create checkout                                                  */
/* ------------------------------------------------------------------ */
export const createCheckoutSession = onCall({ secrets: [STRIPE_SECRET_KEY], cors }, async (request) => {
  const { value, errors } = validateCheckout(request.data)
  if (Object.keys(errors).length) {
    throw new HttpsError('invalid-argument', 'Please check the highlighted fields.', { fields: errors })
  }
  const base = safeReturnBase(request.data?.returnBase)
  if (!base) throw new HttpsError('invalid-argument', 'Unknown site address.')

  const { plan: planId, customer, shipping, consent } = value
  const plan = PLANS[planId]
  const price = await priceByLookupKey(plan.lookupKey)
  const fullName = `${customer.firstName} ${customer.lastName}`.trim()
  const address = toStripeAddress(shipping)

  // Reuse the Stripe customer for this email, keeping name and address current.
  const existing = await stripe().customers.list({ email: customer.email, limit: 1 })
  const customerParams = { name: fullName, email: customer.email, address, shipping: { name: fullName, address } }
  const stripeCustomer = existing.data[0]
    ? await stripe().customers.update(existing.data[0].id, customerParams)
    : await stripe().customers.create({ ...customerParams, metadata: { source: 'dearlyclub.eu' } })

  // Save the order first, so the address is on file even before payment completes.
  const orderRef = db.collection('orders').doc()
  await orderRef.set({
    status: 'pending',
    type: 'new',
    plan: planId,
    customer,
    shipping,
    consent: {
      ...consent,
      termsVersion: TERMS_VERSION,
      at: FieldValue.serverTimestamp(),
      ip: request.rawRequest?.ip ?? null,
    },
    stripe: { customerId: stripeCustomer.id },
    createdAt: FieldValue.serverTimestamp(),
  })

  const metadata = { orderId: orderRef.id, plan: planId }
  const params = {
    mode: plan.mode,
    customer: stripeCustomer.id,
    client_reference_id: orderRef.id,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
    automatic_tax: { enabled: STRIPE_TAX_ENABLED.value() },
    allow_promotion_codes: true,
    locale: 'auto',
    success_url: `${base}checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}checkout?plan=${planId}&cancelled=1`,
  }
  if (STRIPE_TAX_ENABLED.value()) {
    // Tax is worked out from the address the customer gave on our form.
    params.customer_update = { address: 'never', shipping: 'never' }
  }
  if (plan.mode === 'subscription') {
    params.subscription_data = { metadata }
    params.custom_text = {
      submit: { message: 'Your membership renews every month until you cancel. You can skip or cancel anytime.' },
    }
  } else {
    params.payment_intent_data = { metadata, shipping: { name: fullName, address } }
  }

  try {
    const session = await stripe().checkout.sessions.create(params, { idempotencyKey: `order-${orderRef.id}` })
    await orderRef.update({ 'stripe.sessionId': session.id })
    return { url: session.url }
  } catch (err) {
    logger.error('Stripe checkout session failed', { orderId: orderRef.id, message: err.message })
    await orderRef.update({ status: 'failed', error: err.message })
    throw new HttpsError('internal', 'We could not start the payment. Please try again in a moment.')
  }
})

/* ------------------------------------------------------------------ */
/* 2. Success page summary                                             */
/* ------------------------------------------------------------------ */
export const getCheckoutSummary = onCall({ secrets: [STRIPE_SECRET_KEY], cors }, async (request) => {
  const sessionId = String(request.data?.sessionId ?? '')
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw new HttpsError('invalid-argument', 'Invalid session.')

  const session = await stripe().checkout.sessions.retrieve(sessionId)
  if (session.metadata?.giftId) return giftSummary(session)
  const orderId = session.metadata?.orderId
  const order = orderId ? (await db.collection('orders').doc(orderId).get()).data() : null

  return {
    paid: session.payment_status === 'paid' || session.payment_status === 'no_payment_required',
    plan: session.metadata?.plan ?? null,
    firstName: order?.customer?.firstName ?? null,
    email: session.customer_details?.email ?? order?.customer?.email ?? null,
    city: order?.shipping?.city ?? null,
    country: order?.shipping?.country ?? null,
    currency: session.currency,
    subtotal: session.amount_subtotal,
    tax: session.total_details?.amount_tax ?? 0,
    total: session.amount_total,
  }
})

/* ------------------------------------------------------------------ */
/* 3. Stripe webhook                                                   */
/* ------------------------------------------------------------------ */
export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  let event
  try {
    event = stripe().webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET.value())
  } catch (err) {
    logger.warn('Webhook signature check failed', { message: err.message })
    res.status(400).send('Invalid signature')
    return
  }

  // Stripe can deliver an event more than once: handle each only once.
  const marker = db.collection('stripeEvents').doc(event.id)
  try {
    await marker.create({ type: event.type, receivedAt: FieldValue.serverTimestamp() })
  } catch {
    res.json({ received: true, duplicate: true })
    return
  }

  try {
    await handleEvent(event)
    res.json({ received: true })
  } catch (err) {
    logger.error('Webhook handling failed', { type: event.type, id: event.id, message: err.message })
    await marker.delete() // let Stripe retry
    res.status(500).send('Handler error')
  }
})

async function handleEvent(event) {
  const obj = event.data.object

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (obj.metadata?.giftId) {
        if (obj.payment_status === 'paid') await fulfilGiftPayment(obj)
        return
      }
      const orderId = obj.metadata?.orderId
      if (!orderId) return
      const paid = obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required'
      const orderRef = db.collection('orders').doc(orderId)
      await orderRef.set(
        {
          status: paid ? 'paid' : 'processing',
          paidAt: paid ? FieldValue.serverTimestamp() : null,
          letterMonth: letterMonth(), // e.g. '2026-12' — which month's letter this order receives
          amounts: {
            currency: obj.currency,
            subtotal: obj.amount_subtotal,
            tax: obj.total_details?.amount_tax ?? 0,
            total: obj.amount_total,
          },
          stripe: {
            sessionId: obj.id,
            customerId: obj.customer,
            subscriptionId: obj.subscription ?? null,
            paymentIntentId: obj.payment_intent ?? null,
            invoiceId: obj.invoice ?? null,
          },
        },
        { merge: true },
      )

      // Confirmation email with the key terms (once per order).
      if (paid) {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(orderRef)
          const o = snap.data()
          if (!o || o.confirmationQueued) return
          queueEmail(orderConfirmationEmail(o), tx)
          tx.update(orderRef, { confirmationQueued: true })
        })
      }

      if (obj.mode === 'subscription' && obj.subscription) {
        const order = (await orderRef.get()).data()
        await db.collection('members').doc(obj.customer).set(
          {
            email: order.customer.email,
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            shipping: order.shipping,
            plan: 'member',
            status: 'active',
            subscriptionId: obj.subscription,
            firstOrderId: orderId,
            joinedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      }
      return
    }

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      if (obj.metadata?.giftId) {
        await db.collection('gifts').doc(obj.metadata.giftId).set({ status: 'abandoned' }, { merge: true })
        return
      }
      const orderId = obj.metadata?.orderId
      if (orderId) {
        await db
          .collection('orders')
          .doc(orderId)
          .set({ status: event.type.endsWith('expired') ? 'abandoned' : 'failed' }, { merge: true })
      }
      return
    }

    // Monthly renewal paid → add a new order for that month's letter.
    case 'invoice.paid': {
      if (obj.billing_reason !== 'subscription_cycle') return
      const memberSnap = await db.collection('members').doc(obj.customer).get()
      const member = memberSnap.data()
      if (!member) {
        logger.warn('Renewal for unknown member', { customer: obj.customer })
        return
      }
      await db
        .collection('orders')
        .doc(`renewal_${obj.id}`)
        .set({
          status: 'paid',
          type: 'renewal',
          plan: 'member',
          letterMonth: letterMonth(new Date(obj.created * 1000)),
          customer: { firstName: member.firstName, lastName: member.lastName, email: member.email },
          shipping: member.shipping,
          amounts: { currency: obj.currency, subtotal: obj.subtotal, tax: obj.total - obj.subtotal, total: obj.total },
          stripe: { customerId: obj.customer, invoiceId: obj.id },
          createdAt: FieldValue.serverTimestamp(),
          paidAt: FieldValue.serverTimestamp(),
        })
      return
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const periodEnd = obj.items?.data?.[0]?.current_period_end ?? obj.current_period_end ?? null
      await db
        .collection('members')
        .doc(obj.customer)
        .set(
          {
            status: obj.status, // active, past_due, canceled, paused…
            cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      return
    }

    // Member changed their address in the Stripe portal → keep it in sync.
    case 'customer.updated': {
      const ref = db.collection('members').doc(obj.id)
      if (!(await ref.get()).exists || !obj.shipping?.address) return
      const a = obj.shipping.address
      await ref.set(
        {
          shipping: {
            line1: a.line1 ?? '',
            line2: a.line2 ?? '',
            city: a.city ?? '',
            postalCode: a.postal_code ?? '',
            state: a.state ?? '',
            country: a.country ?? '',
          },
          email: obj.email,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return
    }

    default:
      return
  }
}
