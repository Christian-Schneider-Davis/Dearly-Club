/*
 * Site copy.
 * Text marked "verbatim" is copied word for word from the original Wix site
 * (dearlyclub.eu, backed up 12 Nov 2026). Edit here, not inside components.
 */

export const brand = {
  name: 'Dearly Club',
  founder: 'Ariane Lignier',
  tagline: 'Create deeper connection, one letter at a time.', // verbatim
  seoTitle: 'Dearly Club | online thoughtful monthly mail club', // verbatim
  copyright: '© 2026 by Ariane Lignier', // verbatim
}

export const social = [
  { label: 'Instagram', handle: '@dearly.club', href: 'https://www.instagram.com/dearly.club/' },
  { label: 'TikTok', handle: '@dearly.club', href: 'https://www.tiktok.com/@dearly.club' },
]

export const mainNav = [
  { label: 'Memberships', to: '/memberships' },
  { label: 'Gift a Membership', to: '/gift' },
  { label: 'The Dearly Chat', to: '/dearly-chat' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const legalNav = [
  { label: 'Terms & Conditions', to: '/legal/terms' },
  { label: 'Shipping, Returns & Cancellation', to: '/legal/shipping-returns' },
  { label: 'Privacy Policy', to: '/legal/privacy' },
  { label: 'Cookie Policy', to: '/legal/cookies' },
  { label: 'Community Guidelines', to: '/legal/community-guidelines' },
]

export const home = {
  hero: {
    eyebrow: 'A monthly mail club',
    heading: 'Create deeper connection, one letter at a time.', // verbatim
    cta: 'Join the Mail Club', // verbatim ("JOIN THE MAILCLUB")
    secondaryCta: 'Gift a membership',
  },
  why: {
    eyebrow: 'Why Dearly Club?', // verbatim
    // verbatim, in order
    paragraphs: [
      'Dearly Club was born from a simple belief: meaningful relationships deserve more than a quick message.',
      'In a world designed for speed, we make space for slowness. For thoughtful words, intentional rituals, and genuine connection.',
      "At its heart, Dearly Club is a gentle invitation to reach out. To write the letter you've been meaning to send. To tell someone you're thinking of them. To nurture your relationship with yourself and the people you love.",
      'Through monthly writing prompts, slow rituals, and creative tools, Dearly Club helps people cultivate deeper connections with themselves and with those they love.',
    ],
  },
  inside: {
    eyebrow: 'Inside every envelope',
    heading: 'What arrives each month',
    // from the Dearly Member plan description (verbatim items)
    items: [
      'A hand painted postcard',
      'Paper letter',
      'Writing prompt',
      'A connection ritual',
      'Stickers',
      'Some surprises',
    ],
    note: 'Shipping included, worldwide.',
  },
  newsletter: {
    intro: 'Subscribe for letter writing tips, slow rituals and updates', // verbatim
    heading: 'Join our mailing list', // verbatim
    emailLabel: 'Email', // verbatim ("Email*")
    consent: 'I want to subscribe to your mailing list.', // verbatim
    button: 'Subscribe', // verbatim
  },
}

export const about = {
  eyebrow: "Founder's Letter", // verbatim
  greeting: 'Welcome to Dearly Club!', // verbatim
  // verbatim, in order
  paragraphs: [
    'I created Dearly Club because I missed receiving things that mattered. Not notifications. Not another message asking for an immediate reply.',
    'I missed the feeling of opening an envelope addressed to me. The anticipation of discovering what someone had chosen to share. The sense that, for a brief moment, another person had paused long enough to write, reflect, and connect.',
    'For years, my work has centered on helping people communicate ideas that inspire change. Yet outside of work, I noticed something curious: despite being more connected than ever, many of us felt increasingly disconnected from one another. Our conversations became faster. Our attention became fragmented. The small rituals that once helped sustain relationships quietly disappeared.',
    'Dearly Club was born from a simple question:',
    'What would happen if we made space for slower, more intentional connection again? Through letters, creative prompts, and shared rituals, I encourage people to reconnect with themselves and with others in ways that feel personal, thoughtful, and lasting.',
    'At its heart, Dearly is an invitation to write instead of scroll, to reflect instead of rush. To create moments of connection that can be held in your hands and remembered long after they arrive.',
    'You too join the club!',
  ],
  signoff: ['Dearly,', 'Ariane'], // verbatim
  pullQuote: 'I created Dearly Club because I missed receiving things that mattered.',
}

export const contact = {
  intro: 'For inquiries and collaborations please fill out the form. I will get back to you shortly.', // verbatim
  heading: 'Contact Us', // verbatim
  fields: {
    firstName: 'First name', // verbatim, required
    lastName: 'Last name', // verbatim, optional
    email: 'Email', // verbatim, required
    message: 'Write a message', // verbatim
  },
  submit: 'Submit', // verbatim
}

/*
 * Plans. Prices match bofenglin.com (approved by Ariane). Amounts in euro cents.
 * Shipping is included worldwide; VAT/sales tax is added at checkout by Stripe Tax.
 */
export const plans = [
  {
    id: 'member',
    name: 'Dearly Member',
    mode: 'subscription',
    interval: 'month',
    priceCents: 900,
    // verbatim
    description:
      'Monthly membership, that includes every month: A hand painted postcard, paper letter, writing prompt, a connection ritual, stickers and some surprises! Worldwide Shipping!',
    perks: [
      'Join a meaningful community', // verbatim
      'Nurtured content for meaningful connection', // verbatim
      'Member-only content and updates, including pen pal options', // verbatim
    ],
    finePrint: 'Auto-renews, skip or cancel anytime.',
  },
  {
    id: 'guest',
    name: 'Dearly Guest',
    mode: 'one_time',
    priceCents: 900,
    // verbatim
    description:
      'Your mail includes: A hand painted postcard, paper letter, a writing prompt adapted to the theme of the month, a connection ritual and stickers. Worldwide shipping!',
    perks: [
      'Valid for one month', // verbatim
      'Join a meaningful community', // verbatim
      'Nurtured content for meaningful connection', // verbatim
    ],
    finePrint: 'One letter, no subscription.',
  },
]

export const giftOptions = [
  { months: 3, priceCents: 2700 },
  { months: 6, priceCents: 5400 },
  { months: 12, priceCents: 10800 },
]

export const clubs = [
  { id: 'dearly-club', name: 'The Dearly Club', access: 'free', blurb: 'A private group chat for everyone with an account.' },
  { id: 'pen-pals', name: 'Pen Pal Match & Chat', access: 'member', blurb: 'Request a pen pal and start writing to someone new.' },
  { id: 'slow-rituals', name: 'Slow Rituals', access: 'member', blurb: 'Tools to recenter and reconnect with yourself.' },
]

export function formatPrice(cents, { currency = 'EUR', locale = 'en-IE' } = {}) {
  const whole = cents % 100 === 0
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100)
}

export const membershipPage = {
  eyebrow: 'The Mail Club',
  frequencyLabel: 'Frequency',
  options: {
    member: { label: 'Subscribe — every month', note: 'Skip or cancel anytime', cta: 'Become a member' },
    guest: { label: 'One time purchase', note: "A single month's letter, no renewal", cta: 'Send me one letter' },
  },
  shippingNote: 'Shipping included, worldwide. Any VAT or sales tax for your country is shown at checkout.',
  giftNudge: 'Buying for someone else?',
  steps: [
    { title: 'Choose your plan', text: 'Become a member for a letter every month, or try a single month as a guest.' },
    { title: 'Add your address', text: 'Tell us where to send your mail, anywhere in the world. Shipping is included.' },
    { title: 'Open, write, connect', text: 'Your letter arrives with a prompt and a ritual. Write back to someone you love.' },
  ],
  notes: [
    { title: 'Shipping', text: 'Included in every price, worldwide. Letters are posted once a month.' },
    { title: 'Taxes', text: 'Any VAT or sales tax due for your country is calculated from your address and shown before you pay. Outside the EU, your country may charge import duties on delivery.' },
    { title: 'Skip or cancel', text: 'Members can update their address, skip a month or cancel at any time from their account, as easily as signing up.' },
  ],
}

export const contactPage = {
  successPreview: 'Thank you for your message. The contact form goes live with the new site; until then you can reach Ariane on Instagram.',
}
