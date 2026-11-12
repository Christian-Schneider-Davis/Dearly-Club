import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useState } from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import { db } from '../firebase'
import { addressLines, fmtDate, fmtMoney, fullName, monthLabel, PLAN_LABELS, stripeLink } from '../format'
import useQuery from '../useQuery'
import { Badge, Detail, Drawer, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

const TYPE_LABELS = { new: 'New order', renewal: 'Monthly renewal', gift: 'Gift letter' }

export default function Orders() {
  usePageTitle('Orders')
  const [status, setStatus] = useState('completed')
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const orders = useQuery(() => query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500)), [])
  const visible = orders.rows.filter(
    (o) =>
      (status === 'all' || (status === 'completed' ? ['paid', 'shipped'].includes(o.status) : o.status === status)) &&
      (type === 'all' || o.type === type) &&
      matches(q, fullName(o.customer), o.customer?.email, o.id),
  )

  return (
    <>
      <PageHead title="Orders" intro="Every checkout, renewal and gift letter. Click a row to review it." />
      <div className={styles.toolbar}>
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            ['completed', 'Paid & posted'],
            ['paid', 'To post'],
            ['shipped', 'Posted'],
            ['pending', 'Checkout started'],
            ['abandoned', 'Abandoned'],
            ['failed', 'Failed'],
            ['all', 'All'],
          ]}
        />
        <Select
          label="Type"
          value={type}
          onChange={setType}
          options={[
            ['all', 'All'],
            ['new', 'New orders'],
            ['renewal', 'Renewals'],
            ['gift', 'Gift letters'],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search name, email or order ID" />
      </div>

      <LoadState loading={orders.loading} error={orders.error} empty={!visible.length && 'No orders match.'}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.clickable}`}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Letter</th>
                <th className={styles.num}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} onClick={() => setOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(o)}>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>
                    <strong>{fullName(o.customer)}</strong>
                    <span className={styles.sub}>{o.customer?.email}</span>
                  </td>
                  <td>
                    {PLAN_LABELS[o.plan] ?? o.plan}
                    <span className={styles.sub}>{TYPE_LABELS[o.type] ?? ''}</span>
                  </td>
                  <td>{o.letterMonth ? monthLabel(o.letterMonth) : '—'}</td>
                  <td className={styles.num}>{o.type === 'gift' ? 'prepaid' : fmtMoney(o.amounts?.total, o.amounts?.currency)}</td>
                  <td>
                    <Badge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.rows.length === 500 && <p className={styles.footnote}>Showing the latest 500 orders.</p>}
      </LoadState>

      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function OrderDrawer({ order: o, onClose }) {
  const customerId = o.stripe?.customerId
  return (
    <Drawer title={`${fullName(o.customer)} — ${PLAN_LABELS[o.plan] ?? o.plan}`} onClose={onClose}>
      <dl className={styles.details}>
        <Detail label="Status">
          <Badge status={o.status} />
          {o.shippedAt && ` on ${fmtDate(o.shippedAt)}`}
        </Detail>
        <Detail label="Type">{TYPE_LABELS[o.type] ?? o.type}</Detail>
        <Detail label="Letter">{o.letterMonth && monthLabel(o.letterMonth)}</Detail>
        <Detail label="Placed">{fmtDate(o.createdAt, true)}</Detail>
        <Detail label="Paid">{o.paidAt && fmtDate(o.paidAt, true)}</Detail>
        <Detail label="Email">{o.customer?.email && <a href={`mailto:${o.customer.email}`}>{o.customer.email}</a>}</Detail>
        <Detail label="Ship to">
          {addressLines(o.shipping).map((l) => (
            <span key={l} className={styles.line}>
              {l}
            </span>
          ))}
        </Detail>
        {o.amounts && (
          <Detail label="Amount">
            {fmtMoney(o.amounts.subtotal, o.amounts.currency)} + {fmtMoney(o.amounts.tax, o.amounts.currency)} tax ={' '}
            <strong>{fmtMoney(o.amounts.total, o.amounts.currency)}</strong>
          </Detail>
        )}
        {o.type === 'gift' && <Detail label="Gift">Month {o.giftMonth} of {o.giftMonths}</Detail>}
        {o.consent && (
          <Detail label="Agreed to">
            Terms v{o.consent.termsVersion}
            {o.consent.renewal ? ', monthly renewal' : ''} — {fmtDate(o.consent.at, true)}
          </Detail>
        )}
        {o.error && <Detail label="Error">{o.error}</Detail>}
        <Detail label="Order ID">
          <code>{o.id}</code>
        </Detail>
      </dl>
      <div className={styles.drawerLinks}>
        {customerId && (
          <a href={stripeLink(`customers/${customerId}`)} target="_blank" rel="noreferrer">
            Open customer in Stripe ↗
          </a>
        )}
        {o.stripe?.paymentIntentId && (
          <a href={stripeLink(`payments/${o.stripe.paymentIntentId}`)} target="_blank" rel="noreferrer">
            Payment &amp; refunds in Stripe ↗
          </a>
        )}
        {o.stripe?.invoiceId && !o.stripe?.paymentIntentId && (
          <a href={stripeLink(`invoices/${o.stripe.invoiceId}`)} target="_blank" rel="noreferrer">
            Invoice in Stripe ↗
          </a>
        )}
      </div>
    </Drawer>
  )
}
