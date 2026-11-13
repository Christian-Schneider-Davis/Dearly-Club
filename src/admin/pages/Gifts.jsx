import { collection } from 'firebase/firestore'
import { useState } from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import { callFunction } from '../../lib/firebase'
import { readCallError } from '../../lib/callErrors'
import Button from '../../components/ui/Button'
import { db } from '../firebase'
import { addressLines, fmtDate, fmtMoney, fullName, stripeLink, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, Detail, Drawer, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

const STATUS_LABELS = { paid: 'paid, not emailed', sent: 'emailed', redeemed: 'redeemed', pending: 'checkout started', abandoned: 'abandoned', failed: 'failed' }

export default function Gifts() {
  usePageTitle('Gift cards')
  const [status, setStatus] = useState('sold')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const gifts = useQuery(() => collection(db, 'gifts'), [])

  const sorted = [...gifts.rows].sort((a, b) => (toDate(b.createdAt) ?? 0) - (toDate(a.createdAt) ?? 0))
  const visible = sorted.filter(
    (g) =>
      (status === 'all' ||
        (status === 'sold' ? ['paid', 'sent', 'redeemed'].includes(g.status) : status === 'running' ? g.status === 'redeemed' && g.monthsRemaining > 0 : g.status === status)) &&
      matches(q, g.buyer?.name, g.buyer?.email, g.recipient?.name, g.recipient?.email, g.code, fullName(g.redeemedBy)),
  )

  return (
    <>
      <PageHead title="Gift cards" intro="Gift cards bought, who they’re for, and how many prepaid months are left." />
      <div className={styles.toolbar}>
        <Select
          label="Show"
          value={status}
          onChange={setStatus}
          options={[
            ['sold', 'All sold'],
            ['sent', 'Emailed, not redeemed'],
            ['running', 'Redeemed, months left'],
            ['redeemed', 'Redeemed (all)'],
            ['paid', 'Scheduled / not emailed'],
            ['pending', 'Checkout started'],
            ['all', 'Everything'],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search buyer, recipient or code" />
      </div>
      <LoadState loading={gifts.loading} error={gifts.error} empty={!visible.length && 'No gift cards here yet.'}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.clickable}`}>
            <thead>
              <tr>
                <th>Bought</th>
                <th>From</th>
                <th>For</th>
                <th>Gift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr key={g.id} onClick={() => setOpen(g)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(g)}>
                  <td>{fmtDate(g.paidAt ?? g.createdAt)}</td>
                  <td>
                    <strong>{g.buyer?.name}</strong>
                    <span className={styles.sub}>{g.buyer?.email}</span>
                  </td>
                  <td>
                    <strong>{g.recipient?.name}</strong>
                    <span className={styles.sub}>{g.recipient?.email}</span>
                  </td>
                  <td>
                    {g.months} month{g.months === 1 ? '' : 's'}
                    {g.status === 'redeemed' && <span className={styles.sub}>{g.monthsRemaining ?? 0} left</span>}
                  </td>
                  <td>
                    <Badge status={g.status} label={g.status === 'paid' && g.sendOn ? `sends ${fmtDate(g.sendOn)}` : STATUS_LABELS[g.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
      {open && (
        <GiftDrawer
          gift={open}
          onClose={() => setOpen(null)}
          onResent={() => {
            gifts.setRows((rows) => rows.map((g) => (g.id === open.id ? { ...g, status: 'sent', sentAt: new Date() } : g)))
          }}
        />
      )}
    </>
  )
}

function GiftDrawer({ gift: g, onClose, onResent }) {
  const [state, setState] = useState({ busy: false, msg: '', error: '' })
  const canResend = ['paid', 'sent'].includes(g.status) && g.code

  const resend = async () => {
    if (!window.confirm(`Email the gift card to ${g.recipient?.email} again now?`)) return
    setState({ busy: true, msg: '', error: '' })
    try {
      await callFunction('adminResendGift', { giftId: g.id })
      setState({ busy: false, msg: `Sent to ${g.recipient?.email}.`, error: '' })
      onResent()
    } catch (err) {
      setState({ busy: false, msg: '', error: readCallError(err).message })
    }
  }

  return (
    <Drawer title={`${g.months}-month gift for ${g.recipient?.name ?? '—'}`} onClose={onClose}>
      <dl className={styles.details}>
        <Detail label="Status">
          <Badge status={g.status} label={STATUS_LABELS[g.status]} />
        </Detail>
        <Detail label="Code">{g.code && <code>{g.code}</code>}</Detail>
        <Detail label="From">
          {g.buyer?.name} · <a href={`mailto:${g.buyer?.email}`}>{g.buyer?.email}</a>
        </Detail>
        <Detail label="For">
          {g.recipient?.name} · <a href={`mailto:${g.recipient?.email}`}>{g.recipient?.email}</a>
        </Detail>
        <Detail label="Send on">{g.sendOn ? fmtDate(g.sendOn) : 'Straight away'}</Detail>
        <Detail label="Emailed">{g.sentAt && fmtDate(g.sentAt, true)}</Detail>
        {g.message && (
          <Detail label="Their message">
            <span className={styles.quote}>{g.message}</span>
          </Detail>
        )}
        {g.amounts && <Detail label="Paid">{fmtMoney(g.amounts.total, g.amounts.currency)}</Detail>}
        {g.status === 'redeemed' && (
          <>
            <Detail label="Redeemed by">
              {fullName(g.redeemedBy)} · {g.redeemedBy?.email}
            </Detail>
            <Detail label="Redeemed">{fmtDate(g.redeemedAt)}</Detail>
            <Detail label="Months left">
              {g.monthsRemaining ?? 0} of {g.months}
            </Detail>
            <Detail label="Ship to">
              {addressLines(g.shipping).map((l) => (
                <span key={l} className={styles.line}>
                  {l}
                </span>
              ))}
            </Detail>
          </>
        )}
      </dl>
      {canResend && (
        <div className={styles.drawerActions}>
          <Button onClick={resend} disabled={state.busy}>
            {state.busy ? 'Sending…' : g.status === 'paid' ? 'Email the gift card now' : 'Resend gift card email'}
          </Button>
          {state.msg && (
            <p className={styles.formInfo} role="status">
              {state.msg}
            </p>
          )}
          {state.error && (
            <p className={styles.formError} role="alert">
              {state.error}
            </p>
          )}
        </div>
      )}
      {g.stripe?.paymentIntentId && (
        <div className={styles.drawerLinks}>
          <a href={stripeLink(`payments/${g.stripe.paymentIntentId}`)} target="_blank" rel="noreferrer">
            Payment &amp; refunds in Stripe ↗
          </a>
        </div>
      )}
    </Drawer>
  )
}
