import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, useConsent } from './ConsentProvider'
import styles from './CookieBanner.module.css'

/**
 * First-visit banner with equally weighted Reject / Accept buttons, plus a
 * Customize dialog (also opened from "Cookie settings" in the footer).
 */
export default function CookieBanner() {
  const { decided, choice, gpc, acceptAll, rejectAll, save, settingsOpen, openSettings, closeSettings } = useConsent()

  return (
    <>
      {!decided && !settingsOpen && (
        <section className={styles.banner} role="region" aria-labelledby="cookie-title">
          <h2 id="cookie-title" className={styles.title}>
            A note about cookies
          </h2>
          <p className={styles.text}>
            We only use what's needed to run the site. With your OK, we'd also count visits anonymously to see which pages help people most.{' '}
            <Link to="/legal/cookies">Cookie Policy</Link>
          </p>
          {gpc && <p className={styles.gpc}>Your browser's Global Privacy Control is on, so marketing stays off.</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.choice} onClick={rejectAll}>
              Reject
            </button>
            <button type="button" className={styles.choice} onClick={acceptAll}>
              Accept
            </button>
            <button type="button" className={styles.link} onClick={openSettings}>
              Customize
            </button>
          </div>
        </section>
      )}
      {settingsOpen && <Preferences initial={choice} gpc={gpc} onSave={save} onAcceptAll={acceptAll} onRejectAll={rejectAll} onClose={closeSettings} />}
    </>
  )
}

function Preferences({ initial, gpc, onSave, onAcceptAll, onRejectAll, onClose }) {
  const [prefs, setPrefs] = useState({ analytics: Boolean(initial.analytics), marketing: Boolean(initial.marketing) })
  const dialog = useRef(null)

  useEffect(() => {
    const el = dialog.current
    el?.showModal?.()
    const onCancel = (e) => {
      e.preventDefault()
      onClose()
    }
    el?.addEventListener('cancel', onCancel)
    return () => el?.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="cookie-prefs-title">
      <div className={styles.dialogInner}>
        <h2 id="cookie-prefs-title" className={styles.dialogTitle}>
          Cookie settings
        </h2>
        <p className={styles.text}>
          Choose what we may use. You can change this anytime from "Cookie settings" at the bottom of every page.
        </p>

        <ul className={styles.list}>
          {CATEGORIES.map((c) => {
            const locked = c.required || (c.id === 'marketing' && gpc)
            const checked = c.required ? true : c.id === 'marketing' && gpc ? false : prefs[c.id]
            return (
              <li key={c.id} className={styles.item}>
                <div>
                  <p className={styles.itemLabel} id={`cat-${c.id}`}>
                    {c.label}
                  </p>
                  <p className={styles.itemText}>
                    {c.description}
                    {c.id === 'marketing' && gpc ? ' Turned off by your browser’s Global Privacy Control.' : ''}
                  </p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-labelledby={`cat-${c.id}`}
                    checked={checked}
                    disabled={locked}
                    onChange={(e) => setPrefs((p) => ({ ...p, [c.id]: e.target.checked }))}
                  />
                  <span aria-hidden="true" />
                </label>
              </li>
            )
          })}
        </ul>

        <div className={styles.dialogActions}>
          <button type="button" className={styles.choice} onClick={onRejectAll}>
            Reject all
          </button>
          <button type="button" className={styles.choice} onClick={() => onSave(prefs)}>
            Save choices
          </button>
          <button type="button" className={styles.choice} onClick={onAcceptAll}>
            Accept all
          </button>
        </div>
      </div>
    </dialog>
  )
}
