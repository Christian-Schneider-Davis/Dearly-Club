/** Absolute URL of a page on this site (works on github.io and dearlyclub.eu). */
export const pageUrl = (path) => new URL(import.meta.env.BASE_URL + path.replace(/^\//, ''), window.location.origin).href

const KEY = 'dearly-signin-email'
// The email waiting for a sign-in link, so the link can be finished on this device without retyping it.
export const rememberEmail = (email) => {
  try {
    localStorage.setItem(KEY, email)
  } catch {
    /* private mode: they'll be asked to retype */
  }
}
export const recallEmail = () => {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}
export const forgetEmail = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export const AUTH_MESSAGES = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/user-not-found': 'That email and password don’t match.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'There’s already an account with this email. Sign in instead, or use “Email me a link”.',
  'auth/weak-password': 'Choose a password of at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/invalid-action-code': 'This link has expired or was already used. Ask for a new one below.',
  'auth/expired-action-code': 'This link has expired. Ask for a new one below.',
  'auth/user-disabled': 'This account is paused. Please contact us.',
  'auth/operation-not-allowed': 'This way of signing in isn’t switched on yet. Please use a password, or try again later.',
  'auth/quota-exceeded': 'We can’t send more emails right now. Please try again later, or use a password.',
}
export const authMessage = (err) => {
  if (!AUTH_MESSAGES[err?.code]) console.error('Sign-in error', err?.code, err)
  return AUTH_MESSAGES[err?.code] ?? `Something went wrong (${err?.code ?? 'unknown'}). Please try again.`
}
