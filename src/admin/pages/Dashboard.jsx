import { collection, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import { db } from '../firebase'
import { fmtMoney, monthLabel, parisMonth, toDate } from '../format'
import useQuery from '../useQuery'
import { LoadState, PageHead, Stat } from '../ui'
import styles from '../admin.module.css'

const SIX_MONTHS = 6

const ym = (d) => {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(d).split('-')
  return `${y}-${m}`
}

export default function Dashboard() {
  usePageTitle('Admin')
  const since = new Date()
  since.setMonth(since.getMonth() - SIX_MONTHS, 1)

  const orders = useQuery(() => query(collection(db, 'orders'), where('createdAt', '>=', since)), [])
  const members = useQuery(() => collection(db, 'members'), [])
  const gifts = useQuery(() => collection(db, 'gifts'), [])
  const messages = useQuery(() => query(collection(db, 'messages'), where('status', '==', 'new')), [])
  const withdrawals = useQuery(() => query(collection(db, 'withdrawals'), where('status', '==', 'received')), [])
  const reports = useQuery(() => query(collection(db, 'reports'), where('status', '==', 'open')), [])

  const loading = orders.loading || members.loading || gifts.loading
  const error = orders.error || members.error || gifts.error

  const thisMonth = parisMonth(0)
  const batch = parisMonth(1)
  const paidOrders = orders.rows.filter((o) => ['paid', 'shipped'].includes(o.status))
  const giftSales = gifts.rows.filter((g) => ['paid', 'sent', 'redeemed'].includes(g.status))

  // Money taken (excluding tax), by Paris month. Gift letters cost nothing at shipping time,
  // so gifts count when they're bought.
  const months = Array.from({ length: SIX_MONTHS }, (_, i) => parisMonth(i - SIX_MONTHS + 1))
  const byMonth = Object.fromEntries(months.map((m) => [m, { revenue: 0, newMembers: 0, guests: 0, gifts: 0, letters: 0 }]))
  for (const o of paidOrders) {
    const paid = toDate(o.paidAt) ?? toDate(o.createdAt)
    const bucket = paid && byMonth[ym(paid)]
    if (bucket && o.type !== 'gift') bucket.revenue += o.amounts?.subtotal ?? 0
    if (bucket && o.type === 'new') o.plan === 'guest' ? bucket.guests++ : bucket.newMembers++
    if (byMonth[o.letterMonth]) byMonth[o.letterMonth].letters++
  }
  for (const g of giftSales) {
    const bucket = byMonth[ym(toDate(g.paidAt) ?? toDate(g.createdAt) ?? new Date(0))]
    if (bucket) {
      bucket.revenue += g.amounts?.subtotal ?? 0
      bucket.gifts++
    }
  }

  const activeMembers = members.rows.filter((m) => m.status === 'active').length
  const failingMembers = members.rows.filter((m) => ['past_due', 'unpaid'].includes(m.status))
  const giftMembers = gifts.rows.filter((g) => g.status === 'redeemed' && (g.monthsRemaining ?? 0) > 0).length
  const toShip = paidOrders.filter((o) => o.letterMonth === batch && o.status === 'paid').length
  const inBatch = paidOrders.filter((o) => o.letterMonth === batch).length
  const unsentGifts = gifts.rows.filter((g) => g.status === 'paid' && !g.sendOn)

  const attention = [
    toShip && { to: '/admin/shipping', text: `${toShip} letter${toShip === 1 ? '' : 's'} to post for ${monthLabel(batch)}` },
    messages.rows.length && { to: '/admin/inbox', text: `${messages.rows.length} new message${messages.rows.length === 1 ? '' : 's'}` },
    withdrawals.rows.length && {
      to: '/admin/inbox?tab=withdrawals',
      text: `${withdrawals.rows.length} withdrawal request${withdrawals.rows.length === 1 ? '' : 's'} to handle (refund within 14 days)`,
      urgent: true,
    },
    failingMembers.length && {
      to: '/admin/members?status=past_due',
      text: `${failingMembers.length} member${failingMembers.length === 1 ? '' : 's'} with a failed payment (Stripe retries automatically)`,
    },
    reports.rows.length && { to: '/admin/moderation', text: `${reports.rows.length} reported chat message${reports.rows.length === 1 ? '' : 's'} to review`, urgent: true },
    unsentGifts.length && { to: '/admin/gifts', text: `${unsentGifts.length} paid gift card${unsentGifts.length === 1 ? '' : 's'} not emailed yet` },
  ].filter(Boolean)

  return (
    <>
      <PageHead title="Dashboard" intro={`Letters for ${monthLabel(batch)} are posted 20th–25th ${monthLabel(thisMonth).split(' ')[0]}.`} />
      <LoadState loading={loading} error={error}>
        <div className={styles.stats}>
          <Stat label="Active members" value={activeMembers} hint={giftMembers ? `+ ${giftMembers} on a gift` : undefined} />
          <Stat label={`Revenue ${monthLabel(thisMonth).split(' ')[0]}`} value={fmtMoney(byMonth[thisMonth]?.revenue ?? 0)} hint="before tax" />
          <Stat label={`Letters for ${monthLabel(batch).split(' ')[0]}`} value={inBatch} hint={`${toShip} still to post`} />
          <Stat label="Gift cards sold" value={giftSales.length} hint="last 6 months" />
        </div>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Needs attention</h2>
          {attention.length ? (
            <ul className={styles.attention}>
              {attention.map((a) => (
                <li key={a.text} className={a.urgent ? styles.urgent : undefined}>
                  <Link to={a.to}>{a.text} →</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>All caught up.</p>
          )}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Last six months</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.num}>New members</th>
                  <th className={styles.num}>One-time letters</th>
                  <th className={styles.num}>Gift cards</th>
                  <th className={styles.num}>Letters sent that month</th>
                  <th className={styles.num}>Revenue (before tax)</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m}>
                    <td>{monthLabel(m)}</td>
                    <td className={styles.num}>{byMonth[m].newMembers}</td>
                    <td className={styles.num}>{byMonth[m].guests}</td>
                    <td className={styles.num}>{byMonth[m].gifts}</td>
                    <td className={styles.num}>{byMonth[m].letters}</td>
                    <td className={styles.num}>{fmtMoney(byMonth[m].revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.footnote}>
            Payouts, refunds and fees are in the{' '}
            <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
              Stripe dashboard
            </a>
            .
          </p>
        </section>
      </LoadState>
    </>
  )
}
