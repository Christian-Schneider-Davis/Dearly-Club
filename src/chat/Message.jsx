import { useEffect, useRef, useState } from 'react'
import Avatar from '../account/Avatar'
import MemberBadge from '../components/ui/MemberBadge'
import { chatCopy } from '../content/community'
import styles from './chat.module.css'

const time = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export default function Message({ m, mine, isHost, onReport, onBlock, onDelete, onRetry, onDiscard, onProfile }) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menu) return
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false)
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  // Hosts can also delete a message that's hidden while under review.
  const canAct = m.id && !m.status && !m.deleted && (!m.hidden || isHost)

  return (
    <article className={`${styles.msg} ${m.grouped ? styles.grouped : ''} ${m.status ? styles.pending : ''}`} aria-label={`${m.name}, ${time(m.at)}`}>
      <div className={styles.avatarCol}>
        {!m.grouped && (
          <button type="button" className={styles.avatarBtn} onClick={onProfile} aria-label={`View ${m.name}’s profile`} disabled={m.deleted}>
            <Avatar name={m.name} color={m.color} size={36} />
          </button>
        )}
      </div>
      <div className={styles.body}>
        {!m.grouped && (
          <p className={styles.meta}>
            <button type="button" className={styles.name} onClick={onProfile} disabled={m.deleted}>
              {m.name}
            </button>
            {m.member && <MemberBadge size={15} />}
            {m.host && <span className={styles.host}>Host</span>}
            <time className={styles.time} dateTime={m.at.toISOString()}>
              {time(m.at)}
            </time>
          </p>
        )}
        {m.deleted ? (
          <p className={styles.gone}>{m.deletedBy === 'host' ? chatCopy.deletedByHost : chatCopy.deleted}</p>
        ) : m.hidden ? (
          <p className={styles.gone}>{mine ? chatCopy.hiddenOwn : chatCopy.hidden}</p>
        ) : (
          <>
            {m.image && (
              <a href={m.image.url ?? m.image.previewUrl} target="_blank" rel="noreferrer" className={styles.photoLink} aria-label={`Open ${m.name}’s photo full size`}>
                <img src={m.image.url ?? m.image.previewUrl} width={m.image.width} height={m.image.height} loading="lazy" decoding="async" alt={m.text ? '' : `Photo shared by ${m.name}`} className={styles.photo} />
              </a>
            )}
            {m.text && <p className={styles.text}>{m.text}</p>}
          </>
        )}
        {m.status === 'sending' && <p className={styles.status}>Sending…</p>}
        {m.status === 'failed' && (
          <p className={styles.failed}>
            {m.error}{' '}
            <button type="button" className={styles.linkButton} onClick={onRetry}>
              Try again
            </button>{' '}
            ·{' '}
            <button type="button" className={styles.linkButton} onClick={onDiscard}>
              Remove
            </button>
          </p>
        )}
      </div>
      {canAct && (
        <div className={styles.actions} ref={menuRef}>
          <button type="button" className={styles.more} aria-label="Message options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            ⋯
          </button>
          {menu && (
            <div className={styles.menu} role="menu">
              {(mine || isHost) && (
                <button type="button" role="menuitem" onClick={() => (setMenu(false), onDelete())}>
                  {mine ? 'Delete message' : 'Delete message (host)'}
                </button>
              )}
              {!mine && (
                <>
                  {!isHost && (
                    <button type="button" role="menuitem" onClick={() => (setMenu(false), onReport())}>
                      Report message
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={() => (setMenu(false), onBlock())}>
                    Block {m.name}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
