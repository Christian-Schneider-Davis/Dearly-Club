import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { mainNav, social } from '../../content/site'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import MemberBadge from '../ui/MemberBadge'
import { isMemberHint, useSessionHint } from '../../lib/sessionHint'
import styles from './MobileMenu.module.css'

/**
 * Full-screen phone menu that opens like an envelope: the burgundy flap
 * folds down, the seal drops in, and the links rise one after another.
 * Escape or the close button shuts it; focus stays inside while open.
 */
export default function MobileMenu({ id, open, onClose }) {
  const session = useSessionHint()
  const member = isMemberHint(session)
  const panel = useRef(null)
  const closeBtn = useRef(null)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusables = panel.current.querySelectorAll('a[href], button')
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [open, onClose])

  return (
    <div
      id={id}
      ref={panel}
      className={styles.menu}
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={!open}
    >
      <svg className={styles.flap} viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0h400L200 150z" />
      </svg>
      <div className={styles.seal}>
        <Logo tone="cream" />
      </div>

      <button ref={closeBtn} type="button" className={styles.close} aria-label="Close menu" onClick={onClose}>
        <Icon name="close" size={22} />
      </button>

      <nav aria-label="Main" className={styles.nav}>
        <ul>
          {mainNav.map((item, i) => (
            <li key={item.to} style={{ '--i': i }}>
              <NavLink to={item.to} onClick={onClose}>
                {item.label}
              </NavLink>
            </li>
          ))}
          <li style={{ '--i': mainNav.length }}>
            <NavLink to="/account" onClick={onClose} className={styles.login}>
              {session ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  {member && <MemberBadge size={20} />}
                  Your account
                </span>
              ) : (
                'Log in'
              )}
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className={styles.footer}>
        {member ? (
          <Button to="/gift" variant="light" size="lg" block onClick={onClose}>
            Gift a membership
          </Button>
        ) : (
          <Button to="/memberships" variant="light" size="lg" block onClick={onClose}>
            Join the Mail Club
          </Button>
        )}
        <div className={styles.social}>
          {social.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={`Dearly Club on ${s.label}`}>
              <Icon name={s.label.toLowerCase()} size={20} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
