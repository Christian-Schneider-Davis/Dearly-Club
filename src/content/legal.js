/*
 * Legal pages. DRAFTS written to EU (GDPR, Consumer Rights Directive incl.
 * the 2026 withdrawal button) and US (state privacy & auto-renewal) norms.
 * Not legal advice: have them reviewed before launch, fill in every
 * [BRACKETED] detail below, then set `draft: false`.
 *
 * Format: sections of paragraphs (strings) or bullet lists ({ list: [...] }).
 */

export const legalEntity = {
  tradingName: 'Dearly Club',
  legalName: 'Dearly Club',
  // Left empty on purpose for now. Spanish law (LSSI art. 10) and EU consumer law
  // expect a postal address and tax ID (NIF) for online sellers — see README.
  address: '',
  country: 'Spain',
  email: 'ariane.lignier@icloud.com',
  vat: '',
  supervisoryAuthority: 'the Agencia Española de Protección de Datos (AEPD), www.aepd.es',
}

export const LEGAL_UPDATED = '12 November 2026'
export const draft = true

const e = legalEntity
const whoWeAre = `Dearly Club is run by ${[e.legalName, e.address, e.country].filter(Boolean).join(', ')}${e.vat ? ` (VAT: ${e.vat})` : ''}. You can reach us at ${e.email} or through the contact form on this website.`

export const legalDocs = {
  terms: {
    title: 'Terms & Conditions',
    intro: 'These terms apply when you buy a Dearly Club membership, a single letter or a gift membership on this website. Please read them before you order. Nothing here limits the rights you have by law as a consumer.',
    sections: [
      { heading: 'Who we are', body: [whoWeAre] },
      {
        heading: 'Your order',
        body: [
          'When you place an order you choose a plan, give us your name, email and the address we should send your letters to, and pay through Stripe, our payment provider. Your contract with us starts when your payment is confirmed. We then send you a confirmation email with your order details and these terms.',
          'Please check your shipping address carefully. We are not responsible for letters sent to an address you gave us that turns out to be incorrect, but we will help where we can.',
        ],
      },
      {
        heading: 'Plans and prices',
        body: [
          {
            list: [
              'Dearly Member: €9 per month, renewing automatically every month until you cancel.',
              'Dearly Guest: €9 for a single month’s letter, no renewal.',
              'Gift membership: €27 (3 months), €54 (6 months) or €108 (12 months), paid once, no renewal.',
            ],
          },
          'Prices are in euros. Shipping is included worldwide. Any VAT or sales tax due for your country is calculated from your address and shown before you pay. Outside the EU, your country may charge import duties or fees on delivery; these are paid by the recipient.',
        ],
      },
      {
        heading: 'Memberships, renewal and cancellation',
        body: [
          'A Dearly Member subscription renews automatically every month on the same day of the month as your first payment, at the price you agreed to plus any applicable tax, until you cancel. Before you pay, we ask you to confirm that you understand this.',
          'You can cancel at any time, online, from “Manage membership” on this website, as easily as you signed up. Cancellation stops all future payments. Your membership stays active until the end of the month you have already paid for, including that month’s letter. You can also update your address or payment card there.',
          'If we ever change the monthly price, we will email you at least 30 days before the change takes effect, and you can cancel before then.',
        ],
      },
      {
        heading: 'When letters are posted',
        body: [
          'Letters are posted between the 20th and 25th of each month. Orders and renewals paid by the 19th of a month (Paris time) receive the following month’s letter; for example, join by 19 November for December’s letter. Orders paid from the 20th receive the letter after that.',
          'Delivery times depend on the postal service and the destination, and are outside our control once a letter is posted.',
        ],
      },
      {
        heading: 'Gift memberships',
        body: [
          'The buyer chooses the duration and gives us the recipient’s name and email. We email the recipient a gift card with a unique code, immediately or on the date the buyer chooses. The recipient redeems the code on this website and gives us their own shipping address; no payment is needed. Their letters then follow the posting schedule above for the number of months bought.',
          'Each code can be redeemed once. Gift codes do not expire and cannot be exchanged for cash. Please keep the code private: anyone who has it can redeem it.',
        ],
      },
      {
        heading: 'Your right to withdraw (14 days)',
        body: [
          'If you are a consumer in the EU, the UK or another country that gives this right, you can withdraw from your purchase within 14 days without giving a reason. For letters and memberships, the 14 days start on the day you receive your first letter. For a gift membership that has not yet been redeemed, they start on the day of purchase.',
          'To withdraw, use “Withdraw from contract here” at the bottom of every page, or email us a clear statement. You can use the model withdrawal form in our Shipping, Returns & Cancellation policy, but you don’t have to.',
          'We will refund all payments for the withdrawn purchase, using the same payment method, within 14 days of receiving your withdrawal. You don’t need to send the letter back.',
        ],
      },
      {
        heading: 'Damaged or missing letters',
        body: [
          'If a letter arrives damaged or hasn’t arrived within 6 weeks of the posting window, tell us within 60 days of that posting window and we will send a replacement or refund that month, whichever you prefer. This is in addition to your legal rights for goods that are faulty or not as described.',
        ],
      },
      {
        heading: 'The Dearly Chat',
        body: [
          'The Dearly Chat is for adults (18+). Creating an account is free; the members’ clubs need an active membership or gift membership, matched by the email address on your account. Using it is subject to our Community Guidelines. We may remove content or suspend accounts that break them. You can delete your account at any time from your account page.',
        ],
      },
      {
        heading: 'Our responsibility to you',
        body: [
          'We are responsible for losses you suffer that are a foreseeable result of us breaking these terms or failing to use reasonable care. We do not exclude or limit our liability where it would be unlawful to do so, including for death or personal injury caused by our negligence or for fraud. Your statutory rights as a consumer are not affected.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms, for example when the law or our services change. The version that applies to your order is the one you accepted at checkout. For memberships, we will email you about important changes in advance, and you can cancel if you don’t agree.',
        ],
      },
      {
        heading: 'Law and disputes',
        body: [
          `These terms are governed by the law of ${e.country}. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live, and you can bring a claim in your local courts. If you have a problem, please contact us first at ${e.email}; we will do our best to resolve it.`,
        ],
      },
    ],
  },

  'shipping-returns': {
    title: 'Shipping, Returns & Cancellation',
    intro: 'Everything about when your letters are posted, what happens if something goes wrong, and how to cancel or withdraw.',
    sections: [
      {
        heading: 'Shipping',
        body: [
          'Shipping is included in every price, worldwide.',
          {
            list: [
              'Letters are posted between the 20th and 25th of each month.',
              'The cutoff is the 19th (Paris time): orders and renewals paid by the 19th receive the following month’s letter. For example, join by 19 November for December’s letter, posted 20–25 November.',
              'Delivery times depend on the postal service and your country.',
              'Outside the EU, your country may charge import duties or fees on delivery. These are paid by the recipient.',
            ],
          },
        ],
      },
      {
        heading: 'Changing your address',
        body: [
          'Members can update their shipping address anytime from “Manage membership”. Changes made by the 19th apply to that month’s posting. Gift recipients can reply to their confirmation email or contact us with a new address.',
        ],
      },
      {
        heading: 'Damaged or missing letters',
        body: [
          'If a letter arrives damaged, or hasn’t arrived within 6 weeks of its posting window, contact us within 60 days of that posting window with your name and order email. We will send a replacement or refund that month, whichever you prefer.',
        ],
      },
      {
        heading: 'Cancelling a membership',
        body: [
          'You can cancel your Dearly Member subscription anytime, online, from “Manage membership”. Enter the email you joined with and we’ll send you a secure link; no password needed. Cancelling stops all future payments, and your membership stays active until the end of the month you have already paid for.',
          'Dearly Guest letters and gift memberships are paid once and never renew, so there is nothing to cancel.',
        ],
      },
      {
        heading: 'Your 14-day right of withdrawal',
        body: [
          'If you are a consumer in the EU, the UK or another country that gives this right, you can withdraw from your contract within 14 days without giving any reason.',
          {
            list: [
              'Letters and memberships: 14 days from the day you (or someone you name, other than the carrier) receive your first letter.',
              'Gift memberships not yet redeemed: 14 days from the day of purchase.',
            ],
          },
          'How to withdraw: use “Withdraw from contract here” at the bottom of every page. You’ll check your details, confirm, and immediately receive an email confirming what you sent and when we received it. You can also email us a clear statement at the address below, using the model form if you like. It’s enough to send your withdrawal before the 14 days end.',
          'What happens next: we refund all payments for the withdrawn purchase, including standard shipping, within 14 days of receiving your withdrawal, using the same payment method you used, at no cost to you. You don’t need to send the letter back. If you withdraw from a membership, it is also cancelled so no further payments are taken.',
        ],
      },
      {
        heading: 'Model withdrawal form',
        body: [
          '(Complete and return this form only if you wish to withdraw from the contract.)',
          {
            list: [
              `To: ${[e.legalName, e.address, e.email].filter(Boolean).join(', ')}`,
              'I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),',
              'Ordered on (*)/received on (*),',
              'Name of consumer(s),',
              'Address of consumer(s),',
              'Signature of consumer(s) (only if this form is notified on paper),',
              'Date',
            ],
          },
          '(*) Delete as appropriate.',
        ],
      },
      { heading: 'Contact', body: [whoWeAre] },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains what personal information Dearly Club collects, why, who we share it with, and the choices and rights you have. We collect only what we need to send you letters and run the club.',
    sections: [
      { heading: 'Who is responsible for your data', body: [`${whoWeAre} We are the “controller” of your personal data under the EU General Data Protection Regulation (GDPR).`] },
      {
        heading: 'What we collect',
        body: [
          {
            list: [
              'Orders: your name, email, shipping address, what you bought, when, and the amount and tax paid.',
              'Payments: handled entirely by Stripe. We never see or store your full card number.',
              'Gifts: the buyer’s name and email, the recipient’s name and email, the personal message and chosen send date, and later the address the recipient gives us.',
              'Consent records: that you accepted our terms (and, for memberships, the monthly renewal), with the date, time and IP address, so we can prove it.',
              'Messages: what you send us through the contact form or by email, and any withdrawal requests.',
              'Newsletter: your email, if you sign up.',
              'The Dearly Chat: your email, the profile you choose to share (name, country, short bio, interests), your confirmation that you are 18+ and accept the Community Guidelines, and the messages you post. Your email is never shown to other members.',
              'Technical data: IP address and basic browser information in the security logs of our hosting and servers, and your cookie choice.',
            ],
          },
        ],
      },
      {
        heading: 'Why we use it, and our legal basis',
        body: [
          {
            list: [
              'To take your order, send your letters, manage your membership and handle refunds: necessary to perform our contract with you (GDPR Art. 6(1)(b)).',
              'To keep invoices and tax records: required by law (Art. 6(1)(c)).',
              'To deliver gifts to recipients the buyer names, prevent fraud and abuse (for example limiting gift-code guesses), and keep the service secure: our legitimate interests (Art. 6(1)(f)).',
              'To send our newsletter and, if you allow it, to count visits anonymously: your consent (Art. 6(1)(a)), which you can withdraw anytime.',
            ],
          },
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'We share personal data only with the service providers that run Dearly Club for us, under contracts that protect it, and with the postal service that delivers your letters. We never sell your personal information.',
          {
            list: [
              'Stripe (payments, tax calculation, receipts and the member portal).',
              'Google Firebase / Google Cloud (our database and servers, located in Belgium, EU).',
              'Our email provider (to send order, gift and service emails).',
              'GitHub (hosts the website; its servers may log your IP address).',
              'Postal services (your name and address, on the envelope).',
            ],
          },
          'Some of these providers are based in the United States. Where data leaves the EU, it is protected by the EU–US Data Privacy Framework or the European Commission’s Standard Contractual Clauses.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          {
            list: [
              `Orders, invoices and tax records: as long as tax and accounting law in ${e.country} requires.`,
              'Membership details: while your membership is active, then with your order records.',
              'Gift details: until the gift is fully delivered, then with the order records.',
              'Contact messages and withdrawal requests: up to 3 years.',
              'Newsletter: until you unsubscribe.',
              'The Dearly Chat account and profile: until you delete it (deleted immediately).',
            ],
          },
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can ask us to give you a copy of your data, correct it, delete it, restrict or object to how we use it, or send it to you or another service in a portable format. Where we rely on your consent, you can withdraw it anytime. Write to us and we will reply within one month.',
          `You also have the right to complain to a data protection authority, in particular in the EU country where you live or work. Our lead authority is ${e.supervisoryAuthority}.`,
        ],
      },
      {
        heading: 'If you live in the United States',
        body: [
          'We do not sell or “share” personal information for targeted advertising, and we honour the Global Privacy Control signal from your browser as an opt-out. Wherever you live, you can ask us to tell you what personal information we hold about you, correct it or delete it, and we will not treat you differently for asking.',
        ],
      },
      { heading: 'Cookies', body: ['See our Cookie Policy for what this website stores in your browser and how to change your choice.'] },
      { heading: 'Children', body: ['Dearly Club is not intended for children under 16, and we do not knowingly collect their data.'] },
      { heading: 'Security', body: ['Your data is stored in a database protected by strict access rules: each person can only see what they are allowed to (for example, your email and address are never visible to other members), changes go through our own server code, all connections are encrypted, and payment details are handled by Stripe.'] },
      { heading: 'Changes', body: ['If we change this policy, we will update the date at the top, and tell members by email about important changes.'] },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    intro: 'This website stores very little in your browser, and nothing for advertising. Here is the full list, and how to change your choice.',
    sections: [
      {
        heading: 'Strictly necessary (always on)',
        body: [
          {
            list: [
              '“dearly-consent” (local storage, 12 months): remembers your cookie choice so we don’t ask on every page.',
              '“dearly-checkout” and “dearly-gift” (session storage, deleted when you close the tab or complete your purchase): remember what you typed in the checkout or gift form if you step away to pay or come back.',
            ],
          },
          'These are needed for the site to work as you ask, so they don’t require consent.',
        ],
      },
      {
        heading: 'Analytics (only with your consent)',
        body: ['None in use today. If we add visitor statistics, they will be listed here and will only run if you turn Analytics on.'],
      },
      {
        heading: 'Marketing (only with your consent)',
        body: ['None in use. We do not use advertising or social-media tracking.'],
      },
      {
        heading: 'Third parties',
        body: [
          'Our fonts are hosted on our own site, so loading a page doesn’t contact Google Fonts or any other font service. When you pay, you move to Stripe’s secure checkout page, where Stripe uses its own cookies to process the payment and prevent fraud, under Stripe’s privacy policy.',
        ],
      },
      {
        heading: 'Changing your choice',
        body: [
          'Use “Cookie settings” at the bottom of any page to change your choice anytime. If your browser sends a Global Privacy Control signal, marketing stays off automatically. You can also clear this site’s data in your browser settings.',
        ],
      },
    ],
  },

  'community-guidelines': {
    title: 'Community Guidelines',
    intro: 'The Dearly Chat is a slow, kind corner of the internet. These guidelines keep it that way. Everyone accepts them when they create an account.',
    sections: [
      {
        heading: 'Be kind',
        body: [{ list: ['Treat everyone with warmth and respect, even when you disagree.', 'No harassment, bullying, hate speech, threats or sexual content.', 'No discrimination based on who someone is.'] }],
      },
      {
        heading: 'Protect privacy',
        body: [
          {
            list: [
              'Don’t share anyone else’s personal information, including messages from private chats.',
              'Only share your home address through Pen Pal Match, after you and your pen pal have both agreed.',
              'Never ask other members for money, passwords or payment details.',
              'Pen-pal chats are private between the two of you. We only read a private message if it is reported to us.',
            ],
          },
        ],
      },
      {
        heading: 'Keep it personal, not commercial',
        body: [{ list: ['No spam, advertising, selling or recruiting.', 'Share your own words and images, or ones you have permission to share.'] }],
      },
      {
        heading: 'Adults only',
        body: ['You must be 18 or older to join the community.'],
      },
      {
        heading: 'Reporting and what we do',
        body: [
          'You can report any message and block any member. We review every report. Depending on what happened, we may remove content, give a warning, pause someone’s access or close their account. For serious or repeated breaches we may do so without warning.',
        ],
      },
    ],
  },
}
