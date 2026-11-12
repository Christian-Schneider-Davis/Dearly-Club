import { collection } from 'firebase/firestore'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import { db } from '../firebase'
import { addressLines, countryName, downloadCsv, fmtDate, fullName, stripeLink, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, Detail, Drawer, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

const STATUS_LABELS = { active: 'active', past_due: 'payment failed', canceled: 'cancelled', unpaid: 'unpaid', paused: 'paused' }

export default function Members() {
  usePageTitle('Members')
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'active')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const members = useQuery(() => collection(db, 'members'), [])

  const sorted = [...members.rows].sort((a, b) => (toDate(b.joinedAt) ?? 0) - (toDate(a.joinedAt) ?? 0))
  const visible = sorted.filter((m) => (status === 'all' || m.status === status) && matches(q, fullName(m), m.email, m.shipping?.city))
  const counts = members.rows.reduce((c, m) => ({ ...c, [m.status]: (c[m.status] ?? 0) + 1 }), {})

  const exportCsv = () =>
    downloadCsv(`dearly-members-${status}.csv`, [
      ['First name', 'Last name', 'Email', 'Status', 'Joined', 'Ends', 'Country', 'City'],
      ...visible.map((m) => [
        m.firstName,
        m.lastName,
        m.email,
        STATUS_LABELS[m.status] ?? m.status,
        fmtDate(m.joinedAt),
        m.cancelAtPeriodEnd ? fmtDate(m.currentPeriodEnd) : '',
        countryName(m.shipping?.country),
        m.shipping?.city,
      ]),
    ])

  return (
    <>
      <PageHead
        title="Members"
        intro={`${counts.active ?? 0} active monthly members. People on a gift card are under Gift cards.`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!visible.length}>
            Download CSV
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            ['active', `Active (${counts.active ?? 0})`],
            ['past_due', `Payment failed (${(counts.past_due ?? 0) + (counts.unpaid ?? 0)})`],
            ['canceled', `Cancelled (${counts.canceled ?? 0})`],
            ['all', `All (${members.rows.length})`],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search name, email or city" />
      </div>
      <LoadState loading={members.loading} error={members.error} empty={!visible.length && 'No members here yet.'}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.clickable}`}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} onClick={() => setOpen(m)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(m)}>
                  <td>
                    <strong>{fullName(m)}</strong>
                    <span className={styles.sub}>{m.email}</span>
                  </td>
                  <td>{countryName(m.shipping?.country)}</td>
                  <td>{fmtDate(m.joinedAt)}</td>
                  <td>
                    <Badge status={m.status} label={m.cancelAtPeriodEnd && m.status === 'active' ? `ends ${fmtDate(m.currentPeriodEnd)}` : STATUS_LABELS[m.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>

      {open && (
        <Drawer title={fullName(open)} onClose={() => setOpen(null)}>
          <dl className={styles.details}>
            <Detail label="Status">
              <Badge status={open.status} label={STATUS_LABELS[open.status]} />
            </Detail>
            <Detail label="Email">
              <a href={`mailto:${open.email}`}>{open.email}</a>
            </Detail>
            <Detail label="Joined">{fmtDate(open.joinedAt)}</Detail>
            <Detail label={open.cancelAtPeriodEnd ? 'Membership ends' : 'Next renewal'}>{fmtDate(open.currentPeriodEnd)}</Detail>
            <Detail label="Ship to">
              {addressLines(open.shipping).map((l) => (
                <span key={l} className={styles.line}>
                  {l}
                </span>
              ))}
            </Detail>
          </dl>
          <p className={styles.footnote}>Members change their own address, card or cancel through “Manage membership”. You can do the same for them in Stripe.</p>
          <div className={styles.drawerLinks}>
            <a href={stripeLink(`customers/${open.id}`)} target="_blank" rel="noreferrer">
              Open in Stripe ↗
            </a>
            <Link to={`/admin/email?to=${encodeURIComponent(open.email)}`}>Email this member</Link>
          </div>
        </Drawer>
      )}
    </>
  )
}
