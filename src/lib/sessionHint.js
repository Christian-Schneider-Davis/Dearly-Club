/*
 * A tiny, Firebase-free note of who is signed in ({ name, tier }), kept in
 * localStorage by the account/chat pages. The public pages (header, home,
 * memberships) read it to say "Hi, Léa" instead of "Log in" and to show
 * members "Gift a membership" instead of "Join" — without downloading Firebase.
 * It's only a display hint: everything that matters is still checked by the server.
 */
import { useSyncExternalStore } from 'react'
import { firebaseConfig } from './firebaseConfig'

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

/** The stored hint, or null (outside React). */
export function readSessionHint() {
  try {
    return JSON.parse(read() ?? 'null')
  } catch {
    return null
  }
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

/*
 * The hint is only a copy. On each visit, compare it with Firebase's own record of
 * who is signed in on this device (kept in IndexedDB), without downloading Firebase:
 * someone signed in gets a hint even if it was never written (or was cleared), and
 * a leftover hint from someone who signed out is removed.
 */
const AUTH_DB = 'firebaseLocalStorageDb'
const AUTH_KEY = `firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`

function readFirebaseUser() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined)
    let req
    try {
      req = indexedDB.open(AUTH_DB)
    } catch {
      return resolve(undefined)
    }
    req.onupgradeneeded = () => req.transaction.abort() // no database yet: nobody has signed in here
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const dbh = req.result
      try {
        const get = dbh.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').get(AUTH_KEY)
        get.onsuccess = () => {
          dbh.close()
          resolve(get.result?.value ?? null)
        }
        get.onerror = () => {
          dbh.close()
          resolve(undefined)
        }
      } catch {
        dbh.close()
        resolve(null)
      }
    }
  })
}

export async function syncSessionHint() {
  const user = await readFirebaseUser()
  if (user === undefined) return // couldn't tell: leave things as they are
  const hint = readSessionHint()
  if (user && !hint) setSessionHint({ name: user.displayName || user.email?.split('@')[0] || '', tier: 'free' })
  else if (!user && hint) setSessionHint(null)
}
