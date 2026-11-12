import { collection, doc, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import { db } from '../firebase'
import { fmtDate, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead, Select } from '../ui'
import styles from '../admin.module.css'

/*
 * Contact-form messages and withdrawal ("cancel within 14 days") requests.
 * Replies go from Ariane's own email; the buttons open her mail app.
 */
export default function Inbox() {
  usePageTitle('Inbox')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'withdrawals' ? 'withdrawals' : 'messages'
  const [show, setShow] = useState('open')

  const messages = useQuery(() => query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(300)), [])
  const withdrawals = useQuery(() => query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(300)), [])
  const list = tab === 'messages' ? messages : withdrawals
  const openStatus = tab === 'messages' ? 'new' : 'received'
  const visible = list.rows.filter((r) => show === 'all' || (show === 'open' ? r.status === openStatus : r.status === 'handled'))
  const openCount = (l, s) => l.rows.filter((r) => r.status === s).length

  const setStatus = async (row, status) => {
    await updateDoc(doc(db, tab, row.id), { status, handledAt: status === 'handled' ? serverTimestamp() : null })
    list.setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status, handledAt: status === 'handled' ? new Date() : null } : r)))
  }

  return (
    <>
      <PageHead title="Inbox" intro="Messages from the contact form and withdrawal requests. Each one also arrived in your email." />
      <div className={styles.tabs} role="tablist">
        {[
          ['messages', 'Messages', openCount(messages, 'new')],
          ['withdrawals', 'Withdrawals', openCount(withdrawals, 'received')],
        ].map(([key, label, n]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? styles.tabActive : styles.tab} onClick={() => setParams(key === 'messages' ? {} : { tab: key })}>
            {label}
            {n > 0 && <span className={styles.count}>{n}</span>}
          </button>
        ))}
      </div>
      <div className={styles.toolbar}>
        <Select
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            ['open', tab === 'messages' ? 'New' : 'To handle'],
            ['handled', 'Handled'],
            ['all', 'All'],
          ]}
        />
      </div>
      {tab === 'withdrawals' && (
        <p className={styles.notice}>
          The law gives you 14 days from each request to refund the payment (refund in Stripe, then cancel the subscription if there is one). Mark it handled once done.
        </p>
      )}

      <LoadState loading={list.loading} error={list.error} empty={!visible.length && 'Nothing here.'}>
        <ul className={styles.cards}>
          {visible.map((r) => (tab === 'messages' ? <Message key={r.id} m={r} onStatus={setStatus} /> : <Withdrawal key={r.id} w={r} onStatus={setStatus} />))}
        </ul>
      </LoadState>
    </>
  )
}

function Message({ m, onStatus }) {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ')
  const reply = `mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Dearly Club')}`
  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <strong>{name}</strong> <span className={styles.muted}>· {m.email}</span>
        </div>
        <div className={styles.cardMeta}>
          {fmtDate(m.createdAt, true)} <Badge status={m.status} />
        </div>
      </div>
      <p className={styles.messageBody}>{m.message}</p>
      <div className={styles.cardActions}>
        <Button href={reply} size="md">
          Reply
        </Button>
        {m.status === 'new' ? (
          <button type="button" className={styles.linkButton} onClick={() => onStatus(m, 'handled')}>
            Mark handled
          </button>
        ) : (
          <button type="button" className={styles.linkButton} onClick={() => onStatus(m, 'new')}>
            Mark as new
          </button>
        )}
      </div>
    </li>
  )
}

function Withdrawal({ w, onStatus }) {
  const received = toDate(w.receivedAt) ?? toDate(w.createdAt)
  const deadline = received ? new Date(received.getTime() + 14 * 86400000) : null
  const late = deadline && w.status === 'received' && deadline < new Date()
  return (
    <li className={`${styles.card} ${w.status === 'received' ? styles.cardUrgent : ''}`}>
      <div className={styles.cardHead}>
        <div>
          <strong>{w.name}</strong> <span className={styles.muted}>· {w.email}</span>
        </div>
        <div className={styles.cardMeta}>
          received {fmtDate(received, true)} <Badge status={w.status} />
        </div>
      </div>
      <dl className={styles.inlineDetails}>
        <div>
          <dt>Withdrawing from</dt>
          <dd>{w.subjectLabel}</dd>
        </div>
        {w.orderDate && (
          <div>
            <dt>Ordered on</dt>
            <dd>{fmtDate(w.orderDate)}</dd>
          </div>
        )}
        {w.reference && (
          <div>
            <dt>Reference</dt>
            <dd>{w.reference}</dd>
          </div>
        )}
        {w.status === 'received' && deadline && (
          <div>
            <dt>Refund by</dt>
            <dd className={late ? styles.late : undefined}>{fmtDate(deadline)}</dd>
          </div>
        )}
      </dl>
      {w.note && <p className={styles.messageBody}>{w.note}</p>}
      <div className={styles.cardActions}>
        <Button href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(w.email)}`} target="_blank" rel="noreferrer" size="md" variant="outline">
          Find in Stripe ↗
        </Button>
        <Button href={`mailto:${w.email}?subject=${encodeURIComponent('Your withdrawal from Dearly Club')}`} size="md" variant="outline">
          Email them
        </Button>
        {w.status === 'received' ? (
          <button type="button" className={styles.linkButton} onClick={() => onStatus(w, 'handled')}>
            Mark handled (refunded)
          </button>
        ) : (
          <button type="button" className={styles.linkButton} onClick={() => onStatus(w, 'received')}>
            Reopen
          </button>
        )}
      </div>
    </li>
  )
}
