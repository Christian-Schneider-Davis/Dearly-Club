import { collection, query, where } from 'firebase/firestore'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { penPalCopy } from '../../content/community'
import usePageTitle from '../../hooks/usePageTitle'
import { readCallError } from '../../lib/callErrors'
import { callFunction } from '../../lib/firebase'
import { db } from '../firebase'
import { countryName, fmtDate, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead } from '../ui'
import styles from '../admin.module.css'

/** Pen Pal Match: who's waiting, current pairs, and matching by hand. */
export default function PenPals() {
  usePageTitle('Pen pals')
  const waiting = useQuery(() => query(collection(db, 'penpalRequests'), where('status', '==', 'waiting')), [])
  const matches = useQuery(() => collection(db, 'penpals'), [])
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)

  const waitRows = [...waiting.rows].sort((a, b) => (toDate(a.createdAt) ?? 0) - (toDate(b.createdAt) ?? 0))
  const active = matches.rows.filter((m) => m.status === 'active').sort((a, b) => (toDate(b.createdAt) ?? 0) - (toDate(a.createdAt) ?? 0))
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)))

  const matchPicked = async () => {
    const [a, b] = picked.map((id) => waitRows.find((r) => r.id === id))
    if (!window.confirm(`Match ${a?.name} with ${b?.name}? Their preferences are ignored when you match by hand, but blocks are always respected.`)) return
    setBusy(true)
    try {
      await callFunction('adminMatchPenPals', { uids: picked })
      setPicked([])
      waiting.reload()
      matches.reload()
    } catch (err) {
      window.alert(readCallError(err).message)
    } finally {
      setBusy(false)
    }
  }
  const end = async (m) => {
    if (!window.confirm('End this match? Their chat becomes read-only and shared addresses are deleted.')) return
    try {
      await callFunction('adminEndPenPal', { matchId: m.id })
      matches.reload()
    } catch (err) {
      window.alert(readCallError(err).message)
    }
  }
  const names = (m) => m.members.map((u) => m.people?.[u]?.name ?? '—').join(' & ')

  return (
    <>
      <PageHead
        title="Pen pals"
        intro={`${waitRows.length} waiting · ${active.length} active pairs. Matching happens automatically (and re-tries every hour); you can also pair two waiting people yourself.`}
      />
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Waiting for a pen pal</h2>
        {picked.length === 2 && (
          <div className={styles.bulkBar}>
            <span>2 selected</span>
            <Button onClick={matchPicked} disabled={busy}>
              Match these two
            </Button>
          </div>
        )}
        <LoadState loading={waiting.loading} error={waiting.error} empty={!waitRows.length && 'Nobody is waiting.'}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.check}>
                    <span className="visually-hidden">Select</span>
                  </th>
                  <th>Member</th>
                  <th>Writes in</th>
                  <th>Wants</th>
                  <th>Waiting since</th>
                </tr>
              </thead>
              <tbody>
                {waitRows.map((r) => (
                  <tr key={r.id} className={picked.includes(r.id) ? styles.rowSelected : undefined}>
                    <td className={styles.check}>
                      <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} />
                    </td>
                    <td>
                      <strong>{r.name}</strong>
                      <span className={styles.sub}>{countryName(r.country)}</span>
                    </td>
                    <td>{r.languages?.join(', ')}</td>
                    <td>
                      {penPalCopy.regions[r.region]}
                      <span className={styles.sub}>{penPalCopy.formats[r.format]}</span>
                      {r.note && <span className={styles.sub}>“{r.note}”</span>}
                    </td>
                    <td>{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Active pairs</h2>
        <LoadState loading={matches.loading} error={matches.error} empty={!active.length && 'No pairs yet.'}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pen pals</th>
                  <th>Since</th>
                  <th>Addresses</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{names(m)}</strong>
                      <span className={styles.sub}>
                        {m.languages?.join(', ')}
                        {m.matchedBy === 'admin' ? ' · matched by you' : ''}
                      </span>
                    </td>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>
                      <Badge status={m.addressesShared ? 'active' : 'pending'} label={m.addressesShared ? 'exchanged' : `${Object.keys(m.addressOffered ?? {}).length}/2 offered`} />
                    </td>
                    <td className={styles.num}>
                      <button type="button" className={styles.linkButton} onClick={() => end(m)}>
                        End match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
        <p className={styles.footnote}>Pen-pal chats and addresses are private. You only see a message here if it’s reported (Moderation).</p>
      </section>
    </>
  )
}
