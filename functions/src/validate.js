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

/* ------------------------------------------------------------------ */
/* Gifts                                                               */
/* ------------------------------------------------------------------ */

export const GIFTS = {
  3: { lookupKey: 'dearly_gift_3m', months: 3 },
  6: { lookupKey: 'dearly_gift_6m', months: 6 },
  12: { lookupKey: 'dearly_gift_12m', months: 12 },
}

export const MESSAGE_MAX = 300

/** 'YYYY-MM-DD' for a Date in Paris time. */
export const parisDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/** Validates a gift purchase. No home address: only emails are needed. */
export function validateGift(input = {}, today = parisDate()) {
  const errors = {}
  const months = Number(input.months)
  if (!GIFTS[months]) errors.months = 'Choose 3, 6 or 12 months.'

  const b = input.buyer ?? {}
  const r = input.recipient ?? {}
  const buyer = { name: clean(b.name, 80), email: clean(b.email, 254).toLowerCase() }
  const recipient = { name: clean(r.name, 80), email: clean(r.email, 254).toLowerCase() }
  // Keep line breaks in the message, but tidy everything else.
  const message = typeof input.message === 'string' ? input.message.replace(/\r/g, '').trim().slice(0, MESSAGE_MAX) : ''

  if (!buyer.name) errors.buyerName = 'Your name is required.'
  if (!EMAIL.test(buyer.email)) errors.buyerEmail = 'A valid email is required.'
  if (!recipient.name) errors.recipientName = "Recipient's name is required."
  if (!EMAIL.test(recipient.email)) errors.recipientEmail = 'A valid email is required.'

  let sendOn = clean(input.sendOn, 10)
  if (sendOn) {
    const maxDate = new Date(`${today}T12:00:00Z`)
    maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sendOn) || Number.isNaN(Date.parse(sendOn))) errors.sendOn = 'Choose a valid date.'
    else if (sendOn < today) errors.sendOn = 'The send date cannot be in the past.'
    else if (sendOn > maxDate.toISOString().slice(0, 10)) errors.sendOn = 'Choose a date within the next year.'
    if (sendOn === today) sendOn = ''
  }

  if (input.consent?.terms !== true) errors.terms = 'You must accept the terms.'

  return { value: { months, buyer, recipient, message, sendOn }, errors }
}

/* Gift codes: DEAR-XXXX-XXXX from an alphabet without look-alike characters (no 0/O, 1/I/L). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function normalizeCode(raw) {
  const chars = String(raw ?? '')
    .toUpperCase()
    .replace(/^\s*DEAR/, '')
    .replace(/[^A-Z0-9]/g, '')
  if (chars.length !== 8 || [...chars].some((c) => !CODE_ALPHABET.includes(c))) return null
  return `DEAR-${chars.slice(0, 4)}-${chars.slice(4)}`
}

/** Validates a redemption: the code plus the recipient's name, email and shipping address. */
export function validateRedeem(input = {}) {
  const errors = {}
  const code = normalizeCode(input.code)
  if (!code) errors.code = 'Please check your gift code (it looks like DEAR-XXXX-XXXX).'

  // Reuse the checkout checks for person + address.
  const { value, errors: base } = validateCheckout({
    plan: 'guest',
    customer: input.customer,
    shipping: input.shipping,
    consent: input.consent,
  })
  for (const k of ['firstName', 'lastName', 'email', 'line1', 'city', 'postalCode', 'country', 'terms']) {
    if (base[k]) errors[k] = base[k]
  }
  return { value: { code, customer: value.customer, shipping: value.shipping }, errors }
}

/* ------------------------------------------------------------------ */
/* Shipping schedule                                                   */
/* Letters are posted between the 20th and 25th of each month. Orders  */
/* placed up to and including the 19th (Paris time) get NEXT month's   */
/* letter; from the 20th they get the one after.                       */
/* ------------------------------------------------------------------ */
export const CUTOFF_DAY = 19

/** 'YYYY-MM' of the letter an order placed at `date` will receive. */
export function letterMonth(date = new Date()) {
  const [y, m, d] = parisDate(date).split('-').map(Number)
  const add = d <= CUTOFF_DAY ? 1 : 2
  const total = y * 12 + (m - 1) + add
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* Withdrawal (EU right of withdrawal, "withdraw from contract here")  */
/* ------------------------------------------------------------------ */
export const WITHDRAW_SUBJECTS = {
  membership: 'Dearly Member subscription',
  letter: 'Dearly Guest letter',
  gift: 'Gift membership',
}

export function validateWithdrawal(input = {}) {
  const errors = {}
  const value = {
    name: clean(input.name, 120),
    email: clean(input.email, 254).toLowerCase(),
    subject: clean(input.subject, 20),
    orderDate: clean(input.orderDate, 10),
    reference: clean(input.reference, 80),
    note: typeof input.note === 'string' ? input.note.replace(/\r/g, '').trim().slice(0, 1000) : '',
  }
  if (!value.name) errors.name = 'Your name is required.'
  if (!EMAIL.test(value.email)) errors.email = 'A valid email is required.'
  if (!WITHDRAW_SUBJECTS[value.subject]) errors.subject = 'Choose what you are withdrawing from.'
  if (value.orderDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.orderDate)) errors.orderDate = 'Choose a valid date.'
  if (input.confirmed !== true) errors.confirmed = 'Please confirm your withdrawal.'
  return { value, errors }
}

/* ------------------------------------------------------------------ */
/* Contact form & admin emails                                         */
/* ------------------------------------------------------------------ */
const longText = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '')

export function validateContact(input = {}) {
  const errors = {}
  const value = {
    firstName: clean(input.firstName, 80),
    lastName: clean(input.lastName, 80),
    email: clean(input.email, 254).toLowerCase(),
    message: longText(input.message, 5000),
  }
  if (!value.firstName) errors.firstName = 'First name is required.'
  if (!EMAIL.test(value.email)) errors.email = 'A valid email is required.'
  if (value.message.length < 10) errors.message = 'Your message needs at least 10 characters.'
  return { value, errors }
}

export const AUDIENCES = ['active', 'all', 'gift', 'newsletter', 'single']

export function validateBroadcast(input = {}) {
  const errors = {}
  const value = {
    audience: clean(input.audience, 10),
    email: clean(input.email, 254).toLowerCase(),
    subject: clean(input.subject, 150),
    body: longText(input.body, 10000),
    dryRun: input.dryRun === true,
  }
  if (!AUDIENCES.includes(value.audience)) errors.audience = 'Choose who to send to.'
  if (value.audience === 'single' && !EMAIL.test(value.email)) errors.email = 'A valid email is required.'
  if (!value.dryRun) {
    if (!value.subject) errors.subject = 'A subject is required.'
    if (value.body.length < 2) errors.body = 'Write a message.'
  }
  return { value, errors }
}

/* ------------------------------------------------------------------ */
/* Newsletter                                                          */
/* ------------------------------------------------------------------ */
export const isEmail = (v) => EMAIL.test(v)

export function validateSubscribe(input = {}) {
  const email = clean(input.email, 254).toLowerCase()
  const errors = {}
  if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address.'
  if (input.consent !== true) errors.consent = 'Please tick the box so we can add you to the list.'
  return { value: { email }, errors }
}

/** Cleans an imported list: valid, unique, lower-case emails with optional first names. */
export function cleanImport(rows = [], max = 5000) {
  const seen = new Set()
  const out = []
  let skipped = 0
  for (const r of Array.isArray(rows) ? rows.slice(0, max) : []) {
    const email = clean(r?.email, 254).toLowerCase()
    if (!EMAIL.test(email) || seen.has(email)) {
      skipped++
      continue
    }
    seen.add(email)
    out.push({ email, firstName: clean(r?.firstName, 80) })
  }
  return { rows: out, skipped }
}
