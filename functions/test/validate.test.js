import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnBase, validateCheckout } from '../src/validate.js'

const good = {
  plan: 'member',
  customer: { firstName: ' Camille ', lastName: 'Moreau', email: 'Camille@Example.com' },
  shipping: { line1: '12 Rue des Fleurs', city: 'Lyon', postalCode: '69001', country: 'fr' },
  consent: { terms: true, renewal: true },
}

test('accepts a complete member order and tidies values', () => {
  const { value, errors } = validateCheckout(good)
  assert.deepEqual(errors, {})
  assert.equal(value.customer.firstName, 'Camille')
  assert.equal(value.customer.email, 'camille@example.com')
  assert.equal(value.shipping.country, 'FR')
})

test('requires every address field except line 2 and state', () => {
  const { errors } = validateCheckout({ ...good, shipping: { country: 'FR' } })
  assert.ok(errors.line1 && errors.city && errors.postalCode)
  assert.equal(errors.line2, undefined)
})

test('postcode optional where countries do not use them', () => {
  const { errors } = validateCheckout({ ...good, shipping: { ...good.shipping, postalCode: '', country: 'IE' } })
  assert.equal(errors.postalCode, undefined)
})

test('members must agree to renewal, guests need not', () => {
  assert.ok(validateCheckout({ ...good, consent: { terms: true } }).errors.renewal)
  assert.equal(validateCheckout({ ...good, plan: 'guest', consent: { terms: true } }).errors.renewal, undefined)
})

test('rejects unknown plans and bad email', () => {
  const { errors } = validateCheckout({ ...good, plan: 'free', customer: { ...good.customer, email: 'nope' } })
  assert.ok(errors.plan && errors.email)
})

test('return links only go back to our own sites', () => {
  assert.equal(safeReturnBase('https://christian-schneider-davis.github.io/Dearly-Club/'), 'https://christian-schneider-davis.github.io/Dearly-Club/')
  assert.equal(safeReturnBase('https://dearlyclub.eu'), 'https://dearlyclub.eu/')
  assert.equal(safeReturnBase('http://localhost:5173/'), 'http://localhost:5173/')
  assert.equal(safeReturnBase('https://evil.example/'), null)
  assert.equal(safeReturnBase('not a url'), null)
})

import { normalizeCode, validateGift, validateRedeem } from '../src/validate.js'

const gift = {
  months: 6,
  buyer: { name: 'Sofia', email: 'sofia@example.com' },
  recipient: { name: 'Léa', email: 'LEA@example.com' },
  message: 'Happy birthday!\nWrite back soon.',
  consent: { terms: true },
}

test('gift: valid purchase needs no address', () => {
  const { value, errors } = validateGift(gift, '2026-11-12')
  assert.deepEqual(errors, {})
  assert.equal(value.recipient.email, 'lea@example.com')
  assert.ok(value.message.includes('\n'))
})

test('gift: rejects bad duration, past or far-future dates', () => {
  assert.ok(validateGift({ ...gift, months: 5 }, '2026-11-12').errors.months)
  assert.ok(validateGift({ ...gift, sendOn: '2026-11-01' }, '2026-11-12').errors.sendOn)
  assert.ok(validateGift({ ...gift, sendOn: '2028-01-01' }, '2026-11-12').errors.sendOn)
  assert.equal(validateGift({ ...gift, sendOn: '2026-12-24' }, '2026-11-12').value.sendOn, '2026-12-24')
  assert.equal(validateGift({ ...gift, sendOn: '2026-11-12' }, '2026-11-12').value.sendOn, '', 'today means send now')
})

test('gift: message is capped at 300 characters', () => {
  assert.equal(validateGift({ ...gift, message: 'x'.repeat(500) }, '2026-11-12').value.message.length, 300)
})

test('codes: tolerant of spacing and case, strict on characters', () => {
  assert.equal(normalizeCode('dear-7k4m-q2xp'), 'DEAR-7K4M-Q2XP')
  assert.equal(normalizeCode(' 7K4M Q2XP '), 'DEAR-7K4M-Q2XP')
  assert.equal(normalizeCode('DEAR-0000-1111'), null, 'look-alike characters are never issued')
  assert.equal(normalizeCode('DEAR-7K4M'), null)
})

test('redeem: needs code, person and full address', () => {
  const { errors } = validateRedeem({ code: 'nope', customer: {}, shipping: {}, consent: {} })
  for (const k of ['code', 'firstName', 'lastName', 'email', 'line1', 'city', 'country', 'terms']) assert.ok(errors[k], k)
})

import { letterMonth } from '../src/validate.js'

test('letter month: 19th is the cutoff (Paris time)', () => {
  assert.equal(letterMonth(new Date('2026-11-19T21:00:00Z')), '2026-12', '19 Nov 22:00 Paris → December letter')
  assert.equal(letterMonth(new Date('2026-11-19T23:30:00Z')), '2027-01', '20 Nov 00:30 Paris → January letter')
  assert.equal(letterMonth(new Date('2026-12-05T10:00:00Z')), '2027-01', 'year rolls over')
  assert.equal(letterMonth(new Date('2026-12-25T10:00:00Z')), '2027-02')
})

import { validateWithdrawal } from '../src/validate.js'

test('withdrawal: needs name, email, subject and the confirm step', () => {
  const ok = validateWithdrawal({ name: 'Camille', email: 'c@example.com', subject: 'membership', confirmed: true })
  assert.deepEqual(ok.errors, {})
  const bad = validateWithdrawal({ subject: 'other' })
  for (const k of ['name', 'email', 'subject', 'confirmed']) assert.ok(bad.errors[k], k)
})

import { validateBroadcast, validateContact } from '../src/validate.js'

test('contact: first name, email and a real message required', () => {
  assert.deepEqual(validateContact({ firstName: 'Léa', email: 'lea@example.com', message: 'Hello, I love it!' }).errors, {})
  const { errors } = validateContact({ message: 'hi' })
  assert.ok(errors.firstName && errors.email && errors.message)
})

test('broadcast: audience rules, preview needs no subject', () => {
  assert.ok(validateBroadcast({ audience: 'everyone' }).errors.audience)
  assert.ok(validateBroadcast({ audience: 'single', email: 'x', subject: 's', body: 'hello' }).errors.email)
  assert.deepEqual(validateBroadcast({ audience: 'active', dryRun: true }).errors, {})
  assert.ok(validateBroadcast({ audience: 'active' }).errors.subject)
})

import { cleanImport, validateSubscribe } from '../src/validate.js'

test('newsletter: needs a valid email and ticked consent', () => {
  assert.deepEqual(validateSubscribe({ email: ' Lea@Example.com ', consent: true }), { value: { email: 'lea@example.com' }, errors: {} })
  const { errors } = validateSubscribe({ email: 'nope', consent: false })
  assert.ok(errors.email && errors.consent)
})

test('newsletter import: dedupes, lower-cases, skips bad rows', () => {
  const { rows, skipped } = cleanImport([{ email: 'A@b.co', firstName: 'Ann' }, { email: 'a@b.co' }, { email: 'bad' }, null])
  assert.deepEqual(rows, [{ email: 'a@b.co', firstName: 'Ann' }])
  assert.equal(skipped, 3)
})
