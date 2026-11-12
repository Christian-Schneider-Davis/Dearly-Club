import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/*
 * Cookie & tracking consent (GDPR / ePrivacy, plus US "Global Privacy Control").
 *
 *  necessary  always on: what the site needs to work (checkout form memory, this choice itself)
 *  analytics  off until accepted: visitor statistics
 *  marketing  off until accepted: ads / social pixels (none used today)
 *
 * The choice is stored in this browser for 12 months, then asked again.
 * Wrap any optional script in <ConsentGate category="analytics">…</ConsentGate>.
 */

const KEY = 'dearly-consent'
const VERSION = 1 // bump when categories change, to ask everyone again
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export const CATEGORIES = [
  {
    id: 'necessary',
    label: 'Strictly necessary',
    required: true,
    description:
      'Needed for the site to work: remembering your checkout or gift details if you step away, and remembering this cookie choice. Always on.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Anonymous visitor statistics that help us see which pages are useful. Off unless you turn it on.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Lets social networks measure our ads. Not used today; off unless you turn it on.',
  },
]

const gpcOn = () => typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!saved || saved.version !== VERSION || Date.now() - saved.decidedAt > MAX_AGE_MS) return null
    return saved
  } catch {
    return null
  }
}

function write(choice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(choice))
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

const ConsentContext = createContext(null)

export function ConsentProvider({ children }) {
  const [choice, setChoice] = useState(() => (typeof window === 'undefined' ? null : read()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gpc = gpcOn()

  const save = useCallback(
    (prefs) => {
      const next = {
        version: VERSION,
        decidedAt: Date.now(),
        analytics: Boolean(prefs.analytics),
        // A browser sending Global Privacy Control has opted out of sale/sharing.
        marketing: gpc ? false : Boolean(prefs.marketing),
        gpc,
      }
      write(next)
      setChoice(next)
      setSettingsOpen(false)
    },
    [gpc],
  )

  // Tell the page (and any future scripts) when consent changes.
  useEffect(() => {
    if (choice) window.dispatchEvent(new CustomEvent('dearly:consent', { detail: choice }))
  }, [choice])

  const value = useMemo(
    () => ({
      decided: Boolean(choice),
      choice: choice ?? { analytics: false, marketing: false },
      gpc,
      allowed: (cat) => cat === 'necessary' || Boolean(choice?.[cat]),
      acceptAll: () => save({ analytics: true, marketing: true }),
      rejectAll: () => save({ analytics: false, marketing: false }),
      save,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [choice, gpc, save, settingsOpen],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used inside <ConsentProvider>')
  return ctx
}

/** Renders its children only once the visitor has agreed to that category. */
export function ConsentGate({ category, children }) {
  const { allowed } = useConsent()
  return allowed(category) ? children : null
}
