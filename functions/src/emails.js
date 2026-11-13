/**
 * Email templates. Emails are queued in the Firestore `mail` collection and
 * sent by our own `sendQueuedEmail` function through Brevo (mailer.js, see README).
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
<p>Your gift is redeemed: <strong>${months(n)}</strong> of letters. Letters are posted between the 20th and 25th of each month.</p>
<p>We'll send them to:<br><span style="color:#5f574f;">${escapeHtml(shipping.line1)}${shipping.line2 ? `, ${escapeHtml(shipping.line2)}` : ''}<br>${escapeHtml(shipping.postalCode)} ${escapeHtml(shipping.city)}, ${escapeHtml(shipping.country)}</span></p>
<p>Moving before your gift ends? Just reply to this email with your new address.</p>`,
  })
  const text = `Welcome to Dearly Club, ${customer.firstName}.\n\nYour gift is redeemed: ${months(n)} of letters. Letters are posted between the 20th and 25th of each month.\n\nMoving before your gift ends? Just reply to this email with your new address.`
  return { to: customer.email, message: { subject: 'Your Dearly Club gift is redeemed', text, html } }
}

/** Queue an email; mailer.js sends it. */
export function queueEmail(mail, tx) {
  const ref = db.collection('mail').doc()
  const data = { ...mail, createdAt: FieldValue.serverTimestamp() }
  return tx ? tx.set(ref, data) : ref.set(data)
}

const monthName = (yyyyMm) => {
  if (!yyyyMm) return ''
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
const postedIn = (yyyyMm) => {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(Date.UTC(y, m - 2, 15)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
}
const euros = (cents, currency = 'eur') =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency.toUpperCase() }).format((cents ?? 0) / 100)

const addressHtml = (s) =>
  `${escapeHtml(s.line1)}${s.line2 ? `, ${escapeHtml(s.line2)}` : ''}<br>${escapeHtml(s.postalCode)} ${escapeHtml(s.city)}${s.state ? `, ${escapeHtml(s.state)}` : ''}<br>${escapeHtml(s.country)}`

/**
 * Order confirmation, sent once a new order is paid. Includes the key terms
 * (renewal, how to cancel, right of withdrawal) as required by EU and US
 * auto-renewal rules.
 */
export function orderConfirmationEmail(order) {
  const isMember = order.plan === 'member'
  const name = order.customer.firstName
  const letter = monthName(order.letterMonth)
  const total = euros(order.amounts?.total, order.amounts?.currency)
  const tax = order.amounts?.tax ? ` (including ${euros(order.amounts.tax, order.amounts.currency)} tax)` : ''
  const renewal = isMember
    ? `<p><strong>Your membership renews automatically every month</strong> on the same day of the month as today, at €9 plus any tax for your address, until you cancel. You can cancel anytime, online, at <a href="${siteUrl('manage')}" style="color:#7a1f24;">Manage membership</a>. Cancelling stops all future payments; your membership stays active until the end of the month you've paid for.</p>`
    : ''
  const html = layout({
    preheader: `Your first letter: ${letter}`,
    body: `
<h1 style="margin:0 0 20px;font-weight:normal;font-size:30px;line-height:1.2;">Thank you, ${escapeHtml(name)}.</h1>
<p>Your ${isMember ? '<strong>Dearly Member</strong> subscription' : '<strong>Dearly Guest</strong> letter'} is confirmed. Paid today: <strong>${total}</strong>${tax}.</p>
<p>Your first letter is <strong>${letter}</strong>'s, posted between 20 and 25 ${postedIn(order.letterMonth)}, to:<br><span style="color:#5f574f;">${addressHtml(order.shipping)}</span></p>
${renewal}
<p style="font-size:15px;color:#5f574f;">If you're a consumer in the EU or UK, you can withdraw within 14 days of receiving your first letter, without giving a reason, using <a href="${siteUrl('legal/withdraw')}" style="color:#7a1f24;">Withdraw from contract here</a> on our website. Full details are in our <a href="${siteUrl('legal/terms')}" style="color:#7a1f24;">Terms</a> and <a href="${siteUrl('legal/shipping-returns')}" style="color:#7a1f24;">Shipping, Returns &amp; Cancellation</a> policy.</p>
<p style="font-size:15px;color:#5f574f;">Your payment receipt comes separately from Stripe.</p>`,
  })
  const text = `Thank you, ${name}.

Your ${isMember ? 'Dearly Member subscription' : 'Dearly Guest letter'} is confirmed. Paid today: ${total}${tax}.

Your first letter is ${letter}'s, posted between 20 and 25 ${postedIn(order.letterMonth)}.
${isMember ? `\nYour membership renews automatically every month on the same day of the month as today, at €9 plus any tax, until you cancel. Cancel anytime online: ${siteUrl('manage')}\n` : ''}
EU/UK consumers can withdraw within 14 days of receiving the first letter: ${siteUrl('legal/withdraw')}
Terms: ${siteUrl('legal/terms')}`
  return {
    to: order.customer.email,
    message: { subject: isMember ? 'Welcome to Dearly Club — your membership is confirmed' : 'Your Dearly Club letter is confirmed', text, html },
  }
}

const receivedAt = (date) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'long', timeZone: 'Europe/Paris' }).format(date)

/** Acknowledgement of a withdrawal, with its content and the date and time we received it. */
export function withdrawalReceiptEmail(w, subjectLabel, date) {
  const rows = [
    ['Name', w.name],
    ['Email', w.email],
    ['Withdrawing from', subjectLabel],
    w.orderDate && ['Ordered or received on', w.orderDate],
    w.reference && ['Order reference or gift code', w.reference],
    w.note && ['Note', w.note],
  ].filter(Boolean)
  const html = layout({
    preheader: 'We have received your withdrawal',
    body: `
<h1 style="margin:0 0 20px;font-weight:normal;font-size:28px;line-height:1.2;">We've received your withdrawal</h1>
<p>Received on <strong>${receivedAt(date)}</strong>.</p>
<p>Your statement: “I hereby withdraw from my contract for the following: ${escapeHtml(subjectLabel)}.”</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;font-size:15px;">${rows
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5f574f;vertical-align:top;">${k}</td><td style="padding:6px 0;">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')}</table>
<p>We'll process your refund to your original payment method within 14 days, and cancel any membership so no further payments are taken. You don't need to send anything back. Keep this email as your record.</p>`,
  })
  const text = `We've received your withdrawal.\nReceived on ${receivedAt(date)}.\n\nYour statement: "I hereby withdraw from my contract for the following: ${subjectLabel}."\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nWe'll refund you within 14 days and cancel any membership. Keep this email as your record.`
  return { to: w.email, message: { subject: 'Your withdrawal has been received — Dearly Club', text, html } }
}

/** Notice to Ariane so she can refund and cancel. */
export function withdrawalNoticeEmail(w, subjectLabel, date, adminEmail) {
  const text = `New withdrawal received ${receivedAt(date)}\n\nName: ${w.name}\nEmail: ${w.email}\nFrom: ${subjectLabel}\nDate: ${w.orderDate || '—'}\nReference: ${w.reference || '—'}\nNote: ${w.note || '—'}\n\nAction: refund in Stripe within 14 days and cancel any subscription.`
  return {
    to: adminEmail,
    replyTo: w.email,
    message: { subject: `Withdrawal: ${w.name} (${subjectLabel})`, text, html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${escapeHtml(text)}</pre>` },
  }
}

/** Contact-form message forwarded to Ariane (reply goes straight to the sender). */
export function contactNoticeEmail(m, adminEmail) {
  const name = `${m.firstName} ${m.lastName}`.trim()
  const text = `New message from ${name} <${m.email}>\n\n${m.message}`
  return {
    to: adminEmail,
    replyTo: m.email,
    message: {
      subject: `Message from ${name} — Dearly Club`,
      text,
      html: layout({
        preheader: `New message from ${name}`,
        body: `<p style="font-family:Arial,sans-serif;font-size:13px;color:#5f574f;">From ${escapeHtml(name)} &lt;${escapeHtml(m.email)}&gt; — reply to this email to answer.</p><p>${escapeHtml(m.message).replace(/\n/g, '<br>')}</p>`,
      }),
    },
  }
}

/** A message Ariane writes to members from the admin area (or to the mailing list). */
export function memberMessageEmail({ to, firstName, subject, body, unsubscribeUrl }) {
  const greeting = firstName ? `Dear ${firstName},` : ''
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const footText = unsubscribeUrl
    ? `You're receiving this because you joined the Dearly Club mailing list. Unsubscribe: ${unsubscribeUrl}`
    : `You're receiving this because you're part of Dearly Club. Manage your membership: ${siteUrl('manage')}`
  const footHtml = unsubscribeUrl
    ? `You're receiving this because you joined the Dearly Club mailing list. <a href="${unsubscribeUrl}" style="color:#7a1f24;">Unsubscribe</a>.`
    : `You're receiving this because you're part of Dearly Club. <a href="${siteUrl('manage')}" style="color:#7a1f24;">Manage your membership</a>.`
  return {
    to,
    message: {
      subject,
      text: `${greeting ? `${greeting}\n\n` : ''}${body}\n\n—\n${footText}`,
      html: layout({
        preheader: subject,
        body: `${greeting ? `<p>${escapeHtml(greeting)}</p>` : ''}${paragraphs}<p style="margin-top:28px;font-family:Arial,sans-serif;font-size:12px;color:#5f574f;">${footHtml}</p>`,
      }),
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
    },
  }
}

/** Double opt-in: "please confirm you want to join the mailing list". */
export function newsletterConfirmEmail({ to, confirmUrl }) {
  return {
    to,
    message: {
      subject: 'Please confirm your subscription — Dearly Club',
      text: `Thank you for joining the Dearly Club mailing list.\n\nPlease confirm your email address by opening this link:\n${confirmUrl}\n\nIf you didn't ask to join, ignore this email and you won't hear from us.`,
      html: layout({
        preheader: 'One click to confirm your subscription',
        body: `<h1 style="margin:0 0 16px;font-weight:normal;font-size:28px;text-align:center;">One last step</h1>
<p>Thank you for joining the Dearly Club mailing list, for letter writing tips, slow rituals and updates.</p>
<p>Please confirm this is your email address:</p>
${button(confirmUrl, 'Confirm my subscription')}
<p style="font-family:Arial,sans-serif;font-size:13px;color:#5f574f;">If you didn't ask to join, ignore this email and you won't hear from us.</p>`,
      }),
    },
  }
}

/** "You've been matched with a pen pal." */
export function penPalMatchedEmail({ to, firstName, partnerName, matchId }) {
  const url = siteUrl(`dearly-chat/pen-pals/${matchId}`)
  return {
    to,
    message: {
      subject: `You have a pen pal: ${partnerName} — Dearly Club`,
      text: `Dear ${firstName || 'friend'},\n\nWe’ve matched you with a pen pal: ${partnerName}. Say hello in your private pen-pal chat:\n${url}\n\nYour home address is only shared if you both choose to.\n\nDearly,\nAriane`,
      html: layout({
        preheader: `Say hello to ${partnerName}`,
        body: `<h1 style="margin:0 0 16px;font-weight:normal;font-size:28px;text-align:center;">You have a pen pal</h1>
<p>Dear ${escapeHtml(firstName || 'friend')},</p>
<p>We’ve matched you with <strong>${escapeHtml(partnerName)}</strong>. Start with a hello in your private pen-pal chat — and when you’re both ready, you can choose to exchange addresses and write real letters.</p>
${button(url, 'Say hello')}
<p style="font-family:Arial,sans-serif;font-size:13px;color:#5f574f;">Your home address is only shared if you both choose to. You can end a pen-pal match at any time.</p>
<p>Dearly,<br>Ariane</p>`,
      }),
    },
  }
}
