import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import { rooms } from '../../content/community'
import { readCallError } from '../../lib/callErrors'
import { callFunction } from '../../lib/firebase'
import { db } from '../firebase'
import { fmtDate } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead, Select } from '../ui'
import styles from '../admin.module.css'

const REASONS = { unkind: 'Unkind or harassing', spam: 'Spam or selling', personal: 'Personal information', sexual: 'Sexual or inappropriate', other: 'Something else' }

/** Reported chat messages. Hide, restore or dismiss; pause the author from Community. */
export default function Moderation() {
  usePageTitle('Moderation')
  const [show, setShow] = useState('open')
  const reports = useQuery(() => query(collection(db, 'reports'), orderBy('updatedAt', 'desc'), limit(300)), [])
  const hidden = useQuery(() => collection(db, 'moderation'), [])
  const hiddenText = Object.fromEntries(hidden.rows.map((h) => [h.id, h]))
  const visible = reports.rows.filter((r) => show === 'all' || r.status === show)
  const openCount = reports.rows.filter((r) => r.status === 'open').length

  const act = async (r, action) => {
    try {
      await callFunction('adminModerate', { room: r.room, id: r.messageId, action })
      reports.setRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, status: action === 'hide' ? 'actioned' : 'dismissed' } : x)))
      hidden.reload()
    } catch (err) {
      window.alert(readCallError(err).message)
    }
  }

  return (
    <>
      <PageHead
        title="Moderation"
        intro={`${openCount} open report${openCount === 1 ? '' : 's'}. A message reported by 3 different people is hidden automatically until you review it.`}
      />
      <div className={styles.toolbar}>
        <Select
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            ['open', `Open (${openCount})`],
            ['actioned', 'Hidden'],
            ['dismissed', 'Dismissed'],
            ['all', 'All'],
          ]}
        />
      </div>
      <LoadState loading={reports.loading} error={reports.error} empty={!visible.length && (show === 'open' ? 'Nothing to review. Lovely.' : 'Nothing here.')}>
        <ul className={styles.cards}>
          {visible.map((r) => {
            const isHidden = Boolean(hiddenText[r.id])
            return (
              <li key={r.id} className={`${styles.card} ${r.status === 'open' ? styles.cardUrgent : ''}`}>
                <div className={styles.cardHead}>
                  <div>
                    <strong>{r.authorName}</strong> <span className={styles.muted}>in {rooms[r.room]?.name ?? r.room} · {fmtDate(r.messageAt, true)}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    {r.count} report{r.count === 1 ? '' : 's'} <Badge status={r.status === 'open' ? 'received' : r.status === 'actioned' ? 'failed' : 'handled'} label={r.status === 'actioned' ? 'hidden' : r.status} />
                  </div>
                </div>
                <p className={styles.messageBody}>{hiddenText[r.id]?.text || r.text || <em>(deleted)</em>}</p>
                <ul className={styles.reasonList}>
                  {(r.reasons ?? []).map((x, i) => (
                    <li key={i}>
                      {REASONS[x.reason] ?? x.reason}
                      {x.note && ` — “${x.note}”`}
                    </li>
                  ))}
                </ul>
                <div className={styles.cardActions}>
                  {isHidden ? (
                    <Button size="md" variant="outline" onClick={() => act(r, 'restore')}>
                      Restore message
                    </Button>
                  ) : (
                    <Button size="md" onClick={() => act(r, 'hide')}>
                      Hide message
                    </Button>
                  )}
                  {r.status === 'open' && (
                    <button type="button" className={styles.linkButton} onClick={() => act(r, 'dismiss')}>
                      Dismiss (it’s fine)
                    </button>
                  )}
                  <Link className={styles.linkButton} to="/admin/accounts">
                    Pause {r.authorName}…
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      </LoadState>
    </>
  )
}
