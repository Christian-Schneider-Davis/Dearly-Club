import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../account/Avatar'
import { db } from '../lib/session'
import styles from './chat.module.css'

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** A member's public profile, opened from their name in the chat. */
export default function ProfileCard({ uid, onClose }) {
  const [p, setP] = useState(undefined)
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    d?.showModal?.()
    getDoc(doc(db, 'profiles', uid))
      .then((s) => setP(s.exists() ? s.data() : null))
      .catch(() => setP(null))
    return () => d?.close?.()
  }, [uid])

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label="Member profile" onClick={(e) => e.target === ref.current && onClose()}>
      <div className={styles.dialogBody}>
        {p === undefined && <p className={styles.muted}>Loading…</p>}
        {p === null && <p className={styles.muted}>This profile isn’t available.</p>}
        {p && (
          <div className={styles.profile}>
            <Avatar name={p.displayName} color={p.avatarColor} size={72} />
            <h2 className={styles.dialogTitle}>
              {p.displayName} {p.host && <span className={styles.host}>Host</span>}
            </h2>
            <p className={styles.muted}>
              {[p.country && (regionNames?.of(p.country) ?? p.country), p.tier === 'member' ? 'Dearly Member' : null].filter(Boolean).join(' · ')}
            </p>
            {p.bio && <p className={styles.bio}>{p.bio}</p>}
            {p.interests?.length > 0 && (
              <ul className={styles.tags}>
                {p.interests.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button type="button" className={styles.linkButton} onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </dialog>
  )
}
