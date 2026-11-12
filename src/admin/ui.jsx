/* Shared building blocks for admin pages. */
import { useEffect } from 'react'
import styles from './admin.module.css'

export function PageHead({ title, intro, actions }) {
  return (
    <div className={styles.pageHead}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {intro && <p className={styles.pageIntro}>{intro}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  )
}

const TONES = {
  paid: 'warn',
  received: 'warn',
  new: 'warn',
  active: 'good',
  shipped: 'good',
  sent: 'good',
  redeemed: 'good',
  handled: 'muted',
  pending: 'muted',
  processing: 'muted',
  abandoned: 'muted',
  canceled: 'muted',
  failed: 'bad',
  past_due: 'bad',
  unpaid: 'bad',
}
const LABELS = { paid: 'to post', received: 'to handle', past_due: 'payment failed' }

export function Badge({ status, label }) {
  return <span className={`${styles.badge} ${styles[`badge_${TONES[status] ?? 'muted'}`]}`}>{label ?? LABELS[status] ?? status ?? '—'}</span>
}

export function LoadState({ loading, error, empty, children }) {
  if (loading) return <p className={styles.muted}>Loading…</p>
  if (error) {
    return (
      <p className={styles.formError} role="alert">
        {error.code === 'permission-denied'
          ? 'This account can’t read that data. Check the admin setup in the README.'
          : 'Could not load this. Check your connection and refresh.'}
      </p>
    )
  }
  if (empty) return <p className={styles.empty}>{empty}</p>
  return children
}

export function Stat({ label, value, hint }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {hint && <p className={styles.statHint}>{hint}</p>}
    </div>
  )
}

export function Search({ value, onChange, placeholder = 'Search name or email' }) {
  return (
    <input
      type="search"
      className={styles.search}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className={styles.inlineSelect}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Side panel for reviewing one record. */
export function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.linkButton} onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}

export function Detail({ label, children }) {
  return (
    <div className={styles.detail}>
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

export const matches = (q, ...values) => {
  const s = q.trim().toLowerCase()
  return !s || values.some((v) => String(v ?? '').toLowerCase().includes(s))
}
