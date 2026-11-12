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
