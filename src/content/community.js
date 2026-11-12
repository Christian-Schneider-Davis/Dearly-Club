/* The Dearly Chat: copy and choices shared by the account area and the clubs page. */

// Keep in step with functions/src/validate.js (AVATAR_COLORS, INTERESTS).
export const avatarColors = {
  burgundy: { bg: '#7a1f24', fg: '#fbf8f3', label: 'Burgundy' },
  oxblood: { bg: '#651611', fg: '#fbf8f3', label: 'Oxblood' },
  sage: { bg: '#3f6b4f', fg: '#fbf8f3', label: 'Sage' },
  ink: { bg: '#2b2622', fg: '#fbf8f3', label: 'Ink' },
  sand: { bg: '#d9c7ae', fg: '#2b2622', label: 'Sand' },
  blush: { bg: '#ebddd3', fg: '#2b2622', label: 'Blush' },
  ochre: { bg: '#9a6a22', fg: '#fbf8f3', label: 'Ochre' },
  lavender: { bg: '#6f5f8f', fg: '#fbf8f3', label: 'Lavender' },
}

export const interests = [
  'letter writing',
  'calligraphy',
  'watercolour',
  'journaling',
  'poetry',
  'books',
  'travel',
  'languages',
  'stationery',
  'photography',
  'nature',
  'slow living',
]

export const chatPage = {
  eyebrow: 'The Dearly Chat',
  heading: 'A slower kind of community',
  intro:
    'A gentle corner of the internet for people who love letters. Create a free account to join The Dearly Club group chat; members also get Pen Pal Match & Chat and Slow Rituals.',
  steps: [
    { title: 'Create your account', text: 'With just your email: we send you a link, no password needed.' },
    { title: 'Make your profile', text: 'A name, your country and a few words about you. Your email and address are never shown.' },
    { title: 'Say hello', text: 'Join the conversation, and if you’re a member, ask for a pen pal.' },
  ],
  safety: 'For adults (18+). Everyone agrees to our Community Guidelines, and every message can be reported.',
  opening: 'Opening soon',
}

export const accountCopy = {
  signInTitle: 'Welcome back',
  signUpTitle: 'Join The Dearly Chat',
  signUpIntro: 'Free for everyone. Members of the mail club get the members’ clubs too: just use the same email you joined with.',
  linkSent: (email) => `We’ve sent a sign-in link to ${email}. Open it on this device to continue. It can take a minute; check spam too.`,
  verifySent: (email) => `We’ve sent a confirmation link to ${email}. Click it, then come back here.`,
}

/* Chat rooms (URL slug → details). Keep access in step with functions/src/validate.js → ROOMS. */
export const rooms = {
  'the-dearly-club': {
    name: 'The Dearly Club',
    access: 'free',
    intro: 'Our group chat for everyone. Say hello, share what you’re writing, and swap ideas for slow, thoughtful living.',
  },
}

export const chatCopy = {
  welcomeNote: 'Be kind, keep personal details private, and never share your home address here. You can report any message.',
  empty: 'No messages yet. Be the first to say hello!',
  placeholder: 'Write a message…',
  hiddenOwn: 'Hidden while we review a report.',
  hidden: 'Message hidden while we review it.',
  deleted: 'Message deleted.',
  reportReasons: {
    unkind: 'Unkind or harassing',
    spam: 'Spam or selling',
    personal: 'Shares personal information',
    sexual: 'Sexual or inappropriate',
    other: 'Something else',
  },
}
