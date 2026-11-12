/**
 * Email templates. Emails are queued in the Firestore `mail` collection and
 * sent by Firebase's "Trigger Email from Firestore" extension (see README).
 * Anything a customer typed is escaped before it goes into HTML.
 */
import { FieldValue } from 'firebase-admin/firestore'
import { db, siteUrl } from './shared.js'

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const months = (n) => `${n} month${n === 1 ? '' : 's'}`

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Shared look: cream paper, burgundy accents, Ariane's logo. Inline styles for email clients. */
function layout({ preheader, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dearly Club</title></head>
<body style="margin:0;background:#f6f1e9;font-family:Georgia,'Times New Roman',serif;color:#2b2622;">
<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e9;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f3;border:1px solid #e2d8cc;border-radius:16px;">
<tr><td align="center" style="padding:32px 32px 8px;"><img src="${siteUrl('email/logo.png')}" width="88" height="88" alt="Dearly Club" style="display:block;"></td></tr>
<tr><td style="padding:8px 40px 40px;font-size:17px;line-height:1.6;">${body}</td></tr>
</table>
<p style="max-width:560px;margin:20px auto 0;font-family:Arial,sans-serif;font-size:12px;color:#5f574f;">Dearly Club · Create deeper connection, one letter at a time.<br><a href="${siteUrl()}" style="color:#7a1f24;">dearlyclub.eu</a></p>
</td></tr></table></body></html>`
}

const button = (href, label) =>
  `<p style="margin:28px 0;text-align:center;"><a href="${href}" style="display:inline-block;background:#7a1f24;color:#fbf8f3;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:16px 28px;border-radius:999px;">${label}</a></p>`

/** The e-gift card sent to the recipient. */
export function giftCardEmail(gift) {
  const redeemUrl = siteUrl(`redeem?code=${encodeURIComponent(gift.code)}`)
  const message = gift.message
    ? `<p style="margin:24px 0;padding:20px 24px;border-left:3px solid #7a1f24;font-style:italic;font-size:19px;">${escapeHtml(gift.message).replace(/\n/g, '<br>')}<br><span style="font-style:normal;font-size:15px;color:#5f574f;">— ${escapeHtml(gift.buyer.name)}</span></p>`
    : ''
  const html = layout({
    preheader: `${gift.buyer.name} sent you ${months(gift.months)} of Dearly Club`,
    body: `
<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#7a1f24;text-align:center;">A gift for ${escapeHtml(gift.recipient.name)}</p>
<h1 style="margin:0 0 24px;font-weight:normal;font-size:32px;line-height:1.2;text-align:center;">${months(gift.months)} of Dearly Club</h1>
<img src="${siteUrl('email/gift-card.jpg')}" width="480" alt="An illustrated envelope" style="display:block;width:100%;max-width:480px;height:auto;margin:0 auto;border-radius:8px;">
<p style="margin:24px 0 0;">Dear ${escapeHtml(gift.recipient.name)},</p>
<p>${escapeHtml(gift.buyer.name)} has given you ${months(gift.months)} of Dearly Club: a hand painted postcard, a paper letter, a writing prompt and a connection ritual, arriving in your mailbox every month.</p>
${message}
<p style="margin:24px 0 8px;text-align:center;font-family:Arial,sans-serif;font-size:13px;color:#5f574f;">Your gift code</p>
<p style="margin:0;text-align:center;font-family:'Courier New',monospace;font-size:26px;letter-spacing:4px;color:#7a1f24;">${gift.code}</p>
${button(redeemUrl, 'Redeem my gift')}
<p style="font-size:15px;color:#5f574f;">When you redeem, you'll add the address where you'd like your letters sent. No payment needed.</p>`,
  })
  const text = `${gift.buyer.name} has given you ${months(gift.months)} of Dearly Club.
${gift.message ? `\n"${gift.message}"\n— ${gift.buyer.name}\n` : ''}
Your gift code: ${gift.code}
Redeem it here: ${redeemUrl}

When you redeem, you'll add the address where you'd like your letters sent. No payment needed.`
  return {
    to: gift.recipient.email,
    message: { subject: `${gift.buyer.name} sent you a gift: ${months(gift.months)} of Dearly Club`, text, html },
  }
}

/** Confirmation to the person who bought the gift. */
export function giftReceiptEmail(gift) {
  const when = gift.sendOn ? `on ${formatDate(gift.sendOn)}` : 'right away'
  const html = layout({
    preheader: `Your gift for ${gift.recipient.name} is ready`,
    body: `
<h1 style="margin:0 0 20px;font-weight:normal;font-size:30px;line-height:1.2;">Thank you, ${escapeHtml(gift.buyer.name)}.</h1>
<p>Your gift of <strong>${months(gift.months)} of Dearly Club</strong> for ${escapeHtml(gift.recipient.name)} is all set. We'll email the gift card to <strong>${escapeHtml(gift.recipient.email)}</strong> ${when}.</p>
<p>For your records, the gift code is <span style="font-family:'Courier New',monospace;color:#7a1f24;">${gift.code}</span>. If the email doesn't arrive, you can pass the code on yourself — they can redeem it at ${siteUrl('redeem')}.</p>
<p style="font-size:15px;color:#5f574f;">Your payment receipt comes separately from Stripe.</p>`,
  })
  const text = `Thank you, ${gift.buyer.name}.

Your gift of ${months(gift.months)} of Dearly Club for ${gift.recipient.name} is all set. We'll email the gift card to ${gift.recipient.email} ${when}.

Gift code: ${gift.code}
They can redeem it at ${siteUrl('redeem')}`
  return { to: gift.buyer.email, message: { subject: `Your Dearly Club gift for ${gift.recipient.name}`, text, html } }
}

/** Welcome note once a gift is redeemed. */
export function giftRedeemedEmail({ customer, months: n, shipping }) {
  const html = layout({
    preheader: 'Your letters are on their way',
    body: `
<h1 style="margin:0 0 20px;font-weight:normal;font-size:30px;line-height:1.2;">Welcome to Dearly Club, ${escapeHtml(customer.firstName)}.</h1>
<p>Your gift is redeemed: <strong>${months(n)}</strong> of letters, starting with this month's.</p>
<p>We'll send them to:<br><span style="color:#5f574f;">${escapeHtml(shipping.line1)}${shipping.line2 ? `, ${escapeHtml(shipping.line2)}` : ''}<br>${escapeHtml(shipping.postalCode)} ${escapeHtml(shipping.city)}, ${escapeHtml(shipping.country)}</span></p>
<p>Moving before your gift ends? Just reply to this email with your new address.</p>`,
  })
  const text = `Welcome to Dearly Club, ${customer.firstName}.\n\nYour gift is redeemed: ${months(n)} of letters, starting with this month's.\n\nMoving before your gift ends? Just reply to this email with your new address.`
  return { to: customer.email, message: { subject: 'Your Dearly Club gift is redeemed', text, html } }
}

/** Queue an email for the Trigger Email extension. */
export function queueEmail(mail, tx) {
  const ref = db.collection('mail').doc()
  const data = { ...mail, createdAt: FieldValue.serverTimestamp() }
  return tx ? tx.set(ref, data) : ref.set(data)
}
