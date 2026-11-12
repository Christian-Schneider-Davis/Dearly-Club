/**
 * One-time Stripe setup for Dearly Club. Safe to run again: it skips anything
 * that already exists.
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.js [--webhook <url>]
 *
 * Creates:
 *  - Products + prices "Dearly Member" (€9/month), "Dearly Guest" (€9 once) and
 *    gift memberships of 3, 6 and 12 months (€27, €54, €108),
 *    found later by their lookup keys
 *  - The customer self-service portal (update address/card, skip via pause, cancel)
 *    and prints its login link for the website
 *  - With --webhook: the webhook endpoint, and prints its signing secret
 *
 * TAX_BEHAVIOR=exclusive (default) adds VAT/sales tax on top of €9 at checkout.
 * TAX_BEHAVIOR=inclusive treats €9 as the final price including tax.
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key?.startsWith('sk_')) {
  console.error('Set STRIPE_SECRET_KEY first (sk_test_... while testing).')
  process.exit(1)
}
const stripe = new Stripe(key)
const taxBehavior = process.env.TAX_BEHAVIOR === 'inclusive' ? 'inclusive' : 'exclusive'
const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST'

const PRODUCTS = [
  {
    lookupKey: 'dearly_member_monthly',
    name: 'Dearly Member',
    description:
      'Monthly membership: a hand painted postcard, paper letter, writing prompt, a connection ritual, stickers and some surprises. Worldwide shipping.',
    price: { unit_amount: 900, currency: 'eur', recurring: { interval: 'month' } },
  },
  {
    lookupKey: 'dearly_guest_once',
    name: 'Dearly Guest',
    description:
      'One month: a hand painted postcard, paper letter, a writing prompt, a connection ritual and stickers. Worldwide shipping.',
    price: { unit_amount: 900, currency: 'eur' },
  },
  ...[3, 6, 12].map((m) => ({
    lookupKey: `dearly_gift_${m}m`,
    name: `Dearly Club Gift — ${m} months`,
    description: `A gift of ${m} months of Dearly Club letters, delivered as an e-gift card. Worldwide shipping.`,
    price: { unit_amount: 900 * m, currency: 'eur' },
  })),
]

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'invoice.paid',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.updated',
]

async function ensurePrices() {
  for (const p of PRODUCTS) {
    const { data } = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 })
    if (data[0]) {
      console.log(`✓ ${p.name}: price already exists (${data[0].id})`)
      continue
    }
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      tax_code: 'txcd_99999999', // general tangible goods (printed mail)
      shippable: true,
      metadata: { app: 'dearly-club' },
    })
    const price = await stripe.prices.create({
      product: product.id,
      lookup_key: p.lookupKey,
      tax_behavior: taxBehavior,
      ...p.price,
    })
    console.log(`+ ${p.name}: created ${price.id} (tax ${taxBehavior})`)
  }
}

async function ensurePortal() {
  const { data } = await stripe.billingPortal.configurations.list({ limit: 10 })
  let config = data.find((c) => c.metadata?.app === 'dearly-club')
  if (!config) {
    config = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Dearly Club — manage your membership' },
      features: {
        customer_update: { enabled: true, allowed_updates: ['email', 'address', 'shipping'] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'unused', 'other'],
          },
        },
      },
      login_page: { enabled: true },
      metadata: { app: 'dearly-club' },
    })
    console.log('+ Customer portal created')
  } else {
    console.log('✓ Customer portal already exists')
  }
  console.log(`\n  Portal login link (put in src/content/site.js → stripe.portalLoginUrl):\n  ${config.login_page?.url}\n`)
}

async function ensureWebhook(url) {
  const { data } = await stripe.webhookEndpoints.list({ limit: 100 })
  const existing = data.find((w) => w.url === url)
  if (existing) {
    console.log(`✓ Webhook already exists for ${url} — its secret is in the Stripe dashboard (Developers → Webhooks).`)
    return
  }
  const hook = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, metadata: { app: 'dearly-club' } })
  console.log(`+ Webhook created for ${url}`)
  console.log('\n  Store this signing secret in Firebase (copy it, then run the command and paste it):')
  console.log(`  ${hook.secret}`)
  console.log('  firebase functions:secrets:set STRIPE_WEBHOOK_SECRET\n')
}

console.log(`Stripe setup — ${mode} mode\n`)
await ensurePrices()
await ensurePortal()
const i = process.argv.indexOf('--webhook')
if (i > -1) await ensureWebhook(process.argv[i + 1])
console.log('Done.')
