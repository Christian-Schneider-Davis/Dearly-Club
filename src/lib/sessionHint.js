/*
 * A tiny, Firebase-free note of who is signed in ({ name, tier }), kept in
 * localStorage by the account/chat pages. The public pages (header, home,
 * memberships) read it to say "Hi, Léa" instead of "Log in" and to show
 * members "Gift a membership" instead of "Join" — without downloading Firebase.
 * It's only a display hint: everything that matters is still checked by the server.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'dearly-session'
const EVENT = 'dearly-session-change'

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setSessionHint(hint) {
  try {
    if (hint) localStorage.setItem(KEY, JSON.stringify({ name: hint.name ?? '', tier: hint.tier === 'member' ? 'member' : 'free' }))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: header just says "Log in" */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb) // other tabs
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** { name, tier } of the signed-in person, or null. */
export function useSessionHint() {
  const raw = useSyncExternalStore(subscribe, read, () => null)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const isMemberHint = (hint) => hint?.tier === 'member'
