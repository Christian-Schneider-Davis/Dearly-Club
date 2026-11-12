import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.SITE_URL = 'https://dearlyclub.eu/'
const { escapeHtml, giftCardEmail, giftReceiptEmail } = await import('../src/emails.js')

const gift = {
  code: 'DEAR-7K4M-Q2XP',
  months: 6,
  buyer: { name: 'Sofia <script>', email: 'sofia@example.com' },
  recipient: { name: 'Léa', email: 'lea@example.com' },
  message: 'Happy birthday!\n<b>Write back</b>',
  sendOn: '2026-12-24',
}

test('escapes customer text in HTML', () => {
  assert.equal(escapeHtml('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;')
  const { message } = giftCardEmail(gift)
  assert.ok(!message.html.includes('<script>'))
  assert.ok(!message.html.includes('<b>Write back</b>'))
  assert.ok(message.html.includes('Happy birthday!<br>'))
})

test('gift card links to redeem with the code and goes to the recipient', () => {
  const mail = giftCardEmail(gift)
  assert.equal(mail.to, 'lea@example.com')
  assert.ok(mail.message.html.includes('https://dearlyclub.eu/redeem?code=DEAR-7K4M-Q2XP'))
  assert.ok(mail.message.text.includes('DEAR-7K4M-Q2XP'))
})

test('buyer receipt mentions the scheduled date', () => {
  const mail = giftReceiptEmail(gift)
  assert.equal(mail.to, 'sofia@example.com')
  assert.ok(mail.message.text.includes('24 December 2026'))
})

const { orderConfirmationEmail, withdrawalReceiptEmail } = await import('../src/emails.js')

test('order confirmation spells out renewal and cancellation for members', () => {
  const mail = orderConfirmationEmail({
    plan: 'member',
    letterMonth: '2026-12',
    customer: { firstName: 'Camille', email: 'c@example.com' },
    shipping: { line1: '12 Rue des Fleurs', city: 'Lyon', postalCode: '69001', country: 'FR' },
    amounts: { total: 1080, tax: 180, currency: 'eur' },
  })
  assert.ok(mail.message.text.includes('December 2026'))
  assert.ok(mail.message.text.includes('posted between 20 and 25 November'))
  assert.ok(mail.message.html.includes('renews automatically'))
  assert.ok(mail.message.html.includes('/manage'))
  assert.ok(mail.message.html.includes('/legal/withdraw'))
})

test('withdrawal receipt contains the statement and time received', () => {
  const mail = withdrawalReceiptEmail({ name: 'Camille', email: 'c@example.com', note: '<b>x</b>' }, 'Dearly Member subscription', new Date('2026-11-12T21:30:00Z'))
  assert.ok(mail.message.text.includes('12 November 2026'))
  assert.ok(mail.message.html.includes('I hereby withdraw'))
  assert.ok(!mail.message.html.includes('<b>x</b>'))
})

const { memberMessageEmail } = await import('../src/emails.js')

test('member email escapes text and keeps paragraphs', () => {
  const m = memberMessageEmail({ to: 'a@b.co', firstName: 'Léa', subject: 'Hi', body: 'One\n\n<script>two</script>' })
  assert.ok(m.message.html.includes('Dear Léa'))
  assert.ok(!m.message.html.includes('<script>'))
  assert.equal((m.message.html.match(/<p>/g) || []).length >= 3, true)
})

test('newsletter emails carry an unsubscribe link and header', () => {
  const m = memberMessageEmail({ to: 'a@b.co', subject: 'Hi', body: 'Hello', unsubscribeUrl: 'https://x.test/newsletter/unsubscribe?token=abc' })
  assert.ok(m.message.html.includes('Unsubscribe'))
  assert.ok(m.message.text.includes('token=abc'))
  assert.equal(m.message.headers['List-Unsubscribe'], '<https://x.test/newsletter/unsubscribe?token=abc>')
  assert.ok(!memberMessageEmail({ to: 'a@b.co', subject: 'Hi', body: 'Hello' }).message.headers)
})
