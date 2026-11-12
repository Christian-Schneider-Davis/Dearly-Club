/** Things every function shares: Firebase, Stripe, secrets, settings. */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError } from 'firebase-functions/v2/https'
import { defineBoolean, defineSecret, defineString } from 'firebase-functions/params'
import Stripe from 'stripe'
import { ALLOWED_ORIGINS } from './validate.js'

initializeApp()
export const db = getFirestore()

setGlobalOptions({ region: 'europe-west1', maxInstances: 10 })

export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')
// Turn off only while Stripe Tax isn't set up yet in the Stripe dashboard.
export const STRIPE_TAX_ENABLED = defineBoolean('STRIPE_TAX_ENABLED', { default: true })
// Public address of the website, used in emails (links + images). Change to https://dearlyclub.eu/ at launch.
export const SITE_URL = defineString('SITE_URL', { default: 'https://christian-schneider-davis.github.io/Dearly-Club/' })

export const cors = [...ALLOWED_ORIGINS, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/]

let stripeClient
export const stripe = () => (stripeClient ??= new Stripe(STRIPE_SECRET_KEY.value()))

// Stripe prices looked up by lookup key (created by scripts/setup-stripe.js), cached per instance.
const priceCache = new Map()
export async function priceByLookupKey(key) {
  if (priceCache.has(key)) return priceCache.get(key)
  const { data } = await stripe().prices.list({ lookup_keys: [key], active: true, limit: 1 })
  if (!data[0]) throw new HttpsError('failed-precondition', `Stripe price "${key}" not found. Run the Stripe setup script.`)
  priceCache.set(key, data[0])
  return data[0]
}

export const toStripeAddress = (s) => ({
  line1: s.line1,
  line2: s.line2 || undefined,
  city: s.city,
  postal_code: s.postalCode || undefined,
  state: s.state || undefined,
  country: s.country,
})

/** Site URL with a trailing slash, for building links in emails. */
export const siteUrl = (path = '') => {
  const base = SITE_URL.value().endsWith('/') ? SITE_URL.value() : `${SITE_URL.value()}/`
  return base + path.replace(/^\//, '')
}
