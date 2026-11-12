import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eyebrow } from '../components/ui/Layout'
import { ritualsCopy as copy, rooms } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import { db } from '../lib/session'
import ChatRoom from './ChatRoom'
import ClubGate from './ClubGate'
import styles from './rituals.module.css'

const monthLabel = (ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym ?? '')) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** /dearly-chat/slow-rituals — Ariane's monthly rituals + the members' circle chat. */
export default function SlowRituals() {
  usePageTitle(copy.title, { noindex: true })
  return (
    <ClubGate name={copy.title} access="member">
      {({ user, profile, account, reload }) => (
        <div className={styles.wrap}>
          <header className={styles.head}>
            <Eyebrow>
              <Link to="/dearly-chat">The Dearly Chat</Link> · Members’ club
            </Eyebrow>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.lead}>{copy.intro}</p>
          </header>
          <Library />
          <ChatRoom embedded room="slow-rituals" info={rooms['slow-rituals']} user={user} profile={profile} account={account} onAccountChange={reload} />
        </div>
      )}
    </ClubGate>
  )
}

function Library() {
  const [rituals, setRituals] = useState(undefined)
  const [open, setOpen] = useState(null)
  useEffect(() => {
    getDocs(query(collection(db, 'rituals'), where('published', '==', true), orderBy('month', 'desc')))
      .then((s) => {
        const rows = s.docs.map((d) => ({ id: d.id, ...d.data() }))
        setRituals(rows)
        setOpen(rows[0]?.id ?? null)
      })
      .catch((err) => {
        console.error(err)
        setRituals(null)
      })
  }, [])

  if (rituals === undefined) return <p className={styles.muted}>Loading…</p>
  if (rituals === null) return <p className={styles.muted}>We couldn’t load the rituals. Please refresh.</p>
  if (!rituals.length) return <p className={styles.empty}>{copy.empty}</p>

  return (
    <div className={styles.list}>
      {rituals.map((r, i) => {
        const isOpen = open === r.id
        return (
          <article key={r.id} className={`${styles.ritual} ${i === 0 ? styles.latest : ''}`}>
            <button type="button" className={styles.ritualHead} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
              <span className={styles.month}>{i === 0 ? `This month · ${monthLabel(r.month)}` : monthLabel(r.month)}</span>
              <span className={styles.ritualTitle}>{r.title}</span>
              {r.intro && <span className={styles.intro}>{r.intro}</span>}
              <span className={styles.chev} aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className={styles.ritualBody}>
                {(r.body ?? '')
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
