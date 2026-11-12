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
