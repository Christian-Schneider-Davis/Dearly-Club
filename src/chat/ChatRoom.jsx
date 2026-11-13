import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatCopy } from '../content/community'
import { readCallError } from '../lib/callErrors'
import { callFunction } from '../lib/firebase'
import { db } from '../lib/session'
import Composer from './Composer'
import Message from './Message'
import ProfileCard from './ProfileCard'
import ReportDialog from './ReportDialog'
import styles from './chat.module.css'

const PAGE = 50
const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : null)

function dayLabel(d) {
  const today = new Date()
  const yest = new Date(Date.now() - 86400000)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yest)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}

// Pen-pal chats ("pp_<id>") live under penpals/<id>/messages; group rooms under rooms/<room>/messages.
const messagesCollection = (room) => (room.startsWith('pp_') ? collection(db, 'penpals', room.slice(3), 'messages') : collection(db, 'rooms', room, 'messages'))

/**
 * A live chat. info: { name, access, label? }. readOnly: a sentence shown instead of the message box.
 * className lets a page size it (e.g. next to a side panel).
 */
export default function ChatRoom({ room, info, user, profile, account, onAccountChange, readOnly, className = '', embedded = false }) {
  const [count, setCount] = useState(PAGE)
  const [msgs, setMsgs] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState([]) // messages being sent
  const [blocked, setBlocked] = useState(account?.blocked ?? [])
  const [reporting, setReporting] = useState(null)
  const [viewing, setViewing] = useState(null) // uid whose profile card is open
  const [notice, setNotice] = useState('')
  const listRef = useRef(null)
  const nearBottom = useRef(true)
  const [unseen, setUnseen] = useState(false)
  const prevHeight = useRef(0)
  const loadingOlder = useRef(false)

  // Live messages (newest `count`, shown oldest → newest).
  useEffect(() => {
    const q = query(messagesCollection(room), orderBy('createdAt', 'desc'), limit(count))
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()
        setMsgs(rows)
        setHasMore(snap.size >= count)
        setError('')
        setPending((p) => p.filter((m) => !m.id || !rows.some((r) => r.id === m.id)))
      },
      (err) => {
        console.error(err)
        setError('We couldn’t load the chat. Check your connection and refresh the page.')
      },
    )
  }, [room, count])

  // Keep the view pinned to the newest message, unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (loadingOlder.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current
      loadingOlder.current = false
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight
    } else {
      setUnseen(true)
    }
    prevHeight.current = el.scrollHeight
  }, [msgs, pending])

  const onScroll = () => {
    const el = listRef.current
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom.current) setUnseen(false)
  }
  const toBottom = () => {
    listRef.current.scrollTop = listRef.current.scrollHeight
    setUnseen(false)
  }
  const loadOlder = () => {
    loadingOlder.current = true
    prevHeight.current = listRef.current.scrollHeight
    setCount((c) => c + PAGE)
  }

  const send = useCallback(
    async (text, retryKey) => {
      const key = retryKey ?? `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`
      nearBottom.current = true
      setPending((p) => [...p.filter((m) => m.key !== key), { key, text, uid: user.uid, name: profile.displayName, color: profile.avatarColor, host: profile.host, member: profile.tier === 'member', status: 'sending', createdAt: new Date() }])
      try {
        const { id } = await callFunction('postMessage', { room, text })
        setPending((p) => p.map((m) => (m.key === key ? { ...m, id, status: 'sent' } : m)))
      } catch (err) {
        setPending((p) => p.map((m) => (m.key === key ? { ...m, status: 'failed', error: readCallError(err, 'Not sent.').message } : m)))
      }
    },
    [room, user.uid, profile],
  )

  const remove = async (m) => {
    if (!window.confirm('Delete this message for everyone?')) return
    try {
      await callFunction('deleteMessage', { room, id: m.id })
    } catch (err) {
      setNotice(readCallError(err).message)
    }
  }
  const block = async (m) => {
    if (!window.confirm(`Block ${m.name}? You won’t see their messages. They won’t be told.`)) return
    try {
      await callFunction('blockMember', { uid: m.uid, block: true })
      setBlocked((b) => [...b, m.uid])
      setNotice(`${m.name} is blocked. You can unblock them from your account page.`)
      onAccountChange?.()
    } catch (err) {
      setNotice(readCallError(err).message)
    }
  }

  // Shown list: real messages + ones being sent, minus blocked people.
  const items = useMemo(() => {
    const shown = [...msgs, ...pending.filter((p) => !p.id || !msgs.some((m) => m.id === p.id))].filter((m) => !blocked.includes(m.uid))
    let prev = null
    return shown.map((m) => {
      const at = toDate(m.createdAt) ?? new Date()
      const newDay = !prev || prev.at.toDateString() !== at.toDateString()
      const grouped = !newDay && prev && prev.uid === m.uid && at - prev.at < 5 * 60000 && !prev.deleted
      prev = { at, uid: m.uid, deleted: m.deleted }
      return { ...m, at, newDay, grouped }
    })
  }, [msgs, pending, blocked])

  return (
    <div className={`${styles.room} ${embedded ? styles.embedded : ''} ${className}`}>
      <header className={styles.roomHead}>
        <div>
          <p className={styles.eyebrow}>
            <Link to="/dearly-chat">The Dearly Chat</Link> · {info.label ?? (info.access === 'free' ? 'Free club' : 'Members’ club')}
          </p>
          {embedded ? <h2 className={styles.roomTitle}>{info.name}</h2> : <h1 className={styles.roomTitle}>{info.name}</h1>}
        </div>
        <Link to="/account" className={styles.me} aria-label="Your account">
          {profile.displayName}
        </Link>
      </header>

      <p className={styles.welcome}>
        {info.welcome ?? chatCopy.welcomeNote} <Link to="/legal/community-guidelines">Community Guidelines</Link>
      </p>

      <div className={styles.listWrap}>
        <div ref={listRef} className={styles.list} onScroll={onScroll} role="log" aria-live="polite" aria-label={`${info.name} messages`}>
          {hasMore && (
            <button type="button" className={styles.older} onClick={loadOlder}>
              Show earlier messages
            </button>
          )}
          {error && <p className={styles.error}>{error}</p>}
          {!error && items.length === 0 && <p className={styles.empty}>{chatCopy.empty}</p>}
          {items.map((m) => (
            <div key={m.id ?? m.key}>
              {m.newDay && (
                <p className={styles.day}>
                  <span>{dayLabel(m.at)}</span>
                </p>
              )}
              <Message
                m={m}
                mine={m.uid === user.uid}
                onReport={() => setReporting(m)}
                onBlock={() => block(m)}
                onDelete={() => remove(m)}
                onRetry={() => send(m.text, m.key)}
                onDiscard={() => setPending((p) => p.filter((x) => x.key !== m.key))}
                onProfile={() => setViewing(m.uid)}
              />
            </div>
          ))}
        </div>
        {unseen && (
          <button type="button" className={styles.newBelow} onClick={toBottom}>
            New messages ↓
          </button>
        )}
      </div>

      {notice && (
        <p className={styles.toast} role="status">
          {notice}{' '}
          <button type="button" className={styles.linkButton} onClick={() => setNotice('')}>
            OK
          </button>
        </p>
      )}

      {readOnly ? <p className={styles.readOnly}>{readOnly}</p> : <Composer onSend={send} />}

      {reporting && <ReportDialog room={room} message={reporting} onClose={() => setReporting(null)} onDone={() => setNotice('Thank you — we’ll take a look.')} />}
      {viewing && <ProfileCard uid={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
