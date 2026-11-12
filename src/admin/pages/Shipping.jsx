import { collection, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import { db } from '../firebase'
import { addressLines, countryName, downloadCsv, fmtDate, fullName, monthLabel, parisMonth, PLAN_LABELS } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

/*
 * One shipping batch = every paid letter for one month (e.g. all "December"
 * letters, posted 20th–25th November). Ariane prints labels from the CSV and
 * ticks letters off as they go in the post.
 */
export default function Shipping() {
  usePageTitle('Shipping list')
  const [month, setMonth] = useState(parisMonth(1))
  const [show, setShow] = useState('paid')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const orders = useQuery(() => query(collection(db, 'orders'), where('letterMonth', '==', month)), [month])

  const batch = useMemo(
    () =>
      orders.rows
        .filter((o) => ['paid', 'shipped'].includes(o.status))
        .sort((a, b) => (a.shipping?.country ?? '').localeCompare(b.shipping?.country ?? '') || fullName(a.customer).localeCompare(fullName(b.customer))),
    [orders.rows],
  )
  const visible = batch.filter((o) => (show === 'all' || o.status === show) && matches(q, fullName(o.customer), o.customer?.email, o.shipping?.city))
  const toShip = batch.filter((o) => o.status === 'paid').length

  const monthOptions = [-1, 0, 1, 2].map((i) => [parisMonth(i), monthLabel(parisMonth(i))])

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id))
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((o) => o.id)))

  const setStatus = async (ids, status) => {
    setBusy(true)
    setError('')
    try {
      await Promise.all(
        ids.map((id) => updateDoc(doc(db, 'orders', id), { status, shippedAt: status === 'shipped' ? serverTimestamp() : null })),
      )
      orders.setRows((rows) => rows.map((o) => (ids.includes(o.id) ? { ...o, status, shippedAt: status === 'shipped' ? new Date() : null } : o)))
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      setError('Could not update. Please refresh and try again.')
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const rows = (selected.size ? batch.filter((o) => selected.has(o.id)) : visible).map((o) => [
      o.customer?.firstName,
      o.customer?.lastName,
      o.shipping?.line1,
      o.shipping?.line2,
      o.shipping?.postalCode,
      o.shipping?.city,
      o.shipping?.state,
      countryName(o.shipping?.country),
      o.shipping?.country,
      o.customer?.email,
      PLAN_LABELS[o.plan] ?? o.plan,
      o.id,
    ])
    downloadCsv(`dearly-letters-${month}.csv`, [
      ['First name', 'Last name', 'Address line 1', 'Address line 2', 'Postcode', 'City', 'State/region', 'Country', 'Country code', 'Email', 'Type', 'Order ID'],
      ...rows,
    ])
  }

  return (
    <>
      <PageHead
        title="Shipping list"
        intro={`${monthLabel(month)} letters — ${batch.length} in total, ${toShip} still to post.`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!visible.length}>
            {selected.size ? `Download ${selected.size} as CSV` : 'Download CSV for labels'}
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <Select label="Letters for" value={month} onChange={(m) => (setMonth(m), setSelected(new Set()))} options={monthOptions} />
        <Select
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            ['paid', 'To post'],
            ['shipped', 'Posted'],
            ['all', 'All'],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search name, email or city" />
      </div>

      {selected.size > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Selected letters">
          <span>{selected.size} selected</span>
          <Button size="md" onClick={() => setStatus([...selected], 'shipped')} disabled={busy}>
            Mark as posted
          </Button>
          <button type="button" className={styles.linkButton} onClick={() => setStatus([...selected], 'paid')} disabled={busy}>
            Move back to “to post”
          </button>
        </div>
      )}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <LoadState loading={orders.loading} error={orders.error} empty={!visible.length && 'No letters here.'}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.check}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th>Name</th>
                <th>Address</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} className={selected.has(o.id) ? styles.rowSelected : undefined}>
                  <td className={styles.check}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select ${fullName(o.customer)}`} />
                  </td>
                  <td>
                    <strong>{fullName(o.customer)}</strong>
                    <span className={styles.sub}>{o.customer?.email}</span>
                  </td>
                  <td className={styles.address}>{addressLines(o.shipping).join(', ')}</td>
                  <td>
                    {PLAN_LABELS[o.plan] ?? o.plan}
                    {o.type === 'gift' && o.giftMonths && <span className={styles.sub}>month {o.giftMonth} of {o.giftMonths}</span>}
                  </td>
                  <td>
                    <Badge status={o.status} label={o.status === 'shipped' ? `posted ${fmtDate(o.shippedAt)}` : undefined} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
    </>
  )
}
