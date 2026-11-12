/**
 * Server-side checks for checkout input. The website validates too, but the
 * server never trusts the browser: everything is re-checked here.
 */

export const PLANS = {
  member: { lookupKey: 'dearly_member_monthly', mode: 'subscription', label: 'Dearly Member' },
  guest: { lookupKey: 'dearly_guest_once', mode: 'payment', label: 'Dearly Guest' },
}

export const TERMS_VERSION = '2026-11'

// Countries where addresses normally have no postcode.
export const NO_POSTCODE = new Set([
  'AE', 'AG', 'AO', 'AW', 'BF', 'BI', 'BJ', 'BO', 'BS', 'BW', 'BZ', 'CD', 'CF', 'CG', 'CI', 'CK', 'CM', 'DJ', 'DM',
  'ER', 'FJ', 'GA', 'GD', 'GH', 'GM', 'GQ', 'GY', 'HK', 'IE', 'JM', 'KI', 'KM', 'KN', 'KP', 'LY', 'ML', 'MO', 'MR',
  'MW', 'NR', 'NU', 'QA', 'RW', 'SB', 'SC', 'SL', 'SR', 'SS', 'ST', 'SY', 'TD', 'TF', 'TG', 'TK', 'TL', 'TO', 'TV',
  'UG', 'VU', 'YE', 'ZW',
])

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

/**
 * Returns { value, errors }. `errors` maps field → message; empty when valid.
 */
export function validateCheckout(input = {}) {
  const errors = {}
  const plan = clean(input.plan, 20)
  if (!PLANS[plan]) errors.plan = 'Unknown plan.'

  const c = input.customer ?? {}
  const a = input.shipping ?? {}
  const customer = {
    firstName: clean(c.firstName, 80),
    lastName: clean(c.lastName, 80),
    email: clean(c.email, 254).toLowerCase(),
  }
  const shipping = {
    line1: clean(a.line1),
    line2: clean(a.line2),
    city: clean(a.city, 120),
    postalCode: clean(a.postalCode, 20).toUpperCase(),
    state: clean(a.state, 120),
    country: clean(a.country, 2).toUpperCase(),
  }

  if (!customer.firstName) errors.firstName = 'First name is required.'
  if (!customer.lastName) errors.lastName = 'Last name is required.'
  if (!EMAIL.test(customer.email)) errors.email = 'A valid email is required.'
  if (!shipping.line1) errors.line1 = 'Street address is required.'
  if (!shipping.city) errors.city = 'City is required.'
  if (!/^[A-Z]{2}$/.test(shipping.country)) errors.country = 'Country is required.'
  if (!shipping.postalCode && !NO_POSTCODE.has(shipping.country)) errors.postalCode = 'Postcode is required.'

  const consent = input.consent ?? {}
  if (consent.terms !== true) errors.terms = 'You must accept the terms.'
  if (PLANS[plan]?.mode === 'subscription' && consent.renewal !== true) {
    errors.renewal = 'You must agree to the monthly renewal.'
  }

  return {
    value: { plan, customer, shipping, consent: { terms: consent.terms === true, renewal: consent.renewal === true } },
    errors,
  }
}

/** Only allow Stripe to send shoppers back to our own sites. */
export const ALLOWED_ORIGINS = [
  'https://christian-schneider-davis.github.io',
  'https://dearlyclub.eu',
  'https://www.dearlyclub.eu',
]

export function safeReturnBase(returnBase) {
  let url
  try {
    url = new URL(returnBase)
  } catch {
    return null
  }
  const isLocal = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (!isLocal && !ALLOWED_ORIGINS.includes(url.origin)) return null
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  return `${url.origin}${path}`
}
