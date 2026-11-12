import { collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import { CheckboxField } from '../../components/forms/Field'
import { readCallError } from '../../lib/callErrors'
import { callFunction } from '../../lib/firebase'
import { readSubscriberFile } from '../csv'
import { db } from '../firebase'
import { downloadCsv, fmtDate, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

const STATUS = { subscribed: 'subscribed', pending: 'awaiting confirmation', unsubscribed: 'unsubscribed' }
const SOURCE = { website: 'Website', 'wix-import': 'Wix import' }

export default function Newsletter() {
  usePageTitle('Newsletter list')
  const [status, setStatus] = useState('subscribed')
  const [q, setQ] = useState('')
  const subs = useQuery(() => collection(db, 'subscribers'), [])

  const sorted = [...subs.rows].sort((a, b) => (toDate(b.createdAt) ?? 0) - (toDate(a.createdAt) ?? 0))
  const visible = sorted.filter((s) => (status === 'all' || s.status === status) && matches(q, s.email, s.firstName))
  const counts = subs.rows.reduce((c, s) => ({ ...c, [s.status]: (c[s.status] ?? 0) + 1 }), {})

  const remove = async (s) => {
    if (!window.confirm(`Take ${s.email} off the newsletter list?`)) return
    await updateDoc(doc(db, 'subscribers', s.id), { status: 'unsubscribed', unsubscribedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    subs.setRows((rows) => rows.map((r) => (r.id === s.id ? { ...r, status: 'unsubscribed' } : r)))
  }

  const exportCsv = () =>
    downloadCsv(`dearly-newsletter-${status}.csv`, [
      ['Email', 'First name', 'Status', 'Source', 'Joined'],
      ...visible.map((s) => [s.email, s.firstName, STATUS[s.status] ?? s.status, SOURCE[s.source] ?? s.source, fmtDate(s.confirmedAt ?? s.createdAt)]),
    ])

  return (
    <>
      <PageHead
        title="Newsletter list"
        intro={`${counts.subscribed ?? 0} subscribers. People join from the form on the home page and confirm by email. Write to them from “Email members”.`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!visible.length}>
            Download CSV
          </Button>
        }
      />
      <Importer onDone={subs.reload} />
      <div className={styles.toolbar}>
        <Select
          label="Show"
          value={status}
          onChange={setStatus}
          options={[
            ['subscribed', `Subscribed (${counts.subscribed ?? 0})`],
            ['pending', `Awaiting confirmation (${counts.pending ?? 0})`],
            ['unsubscribed', `Unsubscribed (${counts.unsubscribed ?? 0})`],
            ['all', `All (${subs.rows.length})`],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search email or name" />
      </div>
      <LoadState loading={subs.loading} error={subs.error} empty={!visible.length && 'No one here yet.'}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Source</th>
                <th>Joined</th>
                <th>Status</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.email}</strong>
                    {s.firstName && <span className={styles.sub}>{s.firstName}</span>}
                  </td>
                  <td>{SOURCE[s.source] ?? s.source}</td>
                  <td>{fmtDate(s.confirmedAt ?? s.createdAt)}</td>
                  <td>
                    <Badge status={s.status === 'subscribed' ? 'active' : s.status === 'pending' ? 'pending' : 'canceled'} label={STATUS[s.status]} />
                  </td>
                  <td className={styles.num}>
                    {s.status !== 'unsubscribed' && (
                      <button type="button" className={styles.linkButton} onClick={() => remove(s)}>
                        Remove
                      </button>
                    )}
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

/** Bring over the Wix mailing list (Wix → Contacts → Export). */
function Importer({ onDone }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null) // { name, rows, notSubscribed }
  const [optIn, setOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const pick = async (e) => {
    setMsg({ type: '', text: '' })
    const f = e.target.files?.[0]
    if (!f) return setFile(null)
    const parsed = readSubscriberFile(await f.text())
    setFile({ name: f.name, ...parsed })
    if (!parsed.rows.length) setMsg({ type: 'error', text: 'No email addresses found in that file.' })
  }

  const run = async () => {
    if (!optIn) return setMsg({ type: 'error', text: 'Tick the box to confirm these people signed up.' })
    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      let added = 0
      let kept = 0
      let skipped = 0
      for (let i = 0; i < file.rows.length; i += 2000) {
        const r = await callFunction('adminImportSubscribers', { rows: file.rows.slice(i, i + 2000), confirmedOptIn: true })
        added += r.added
        kept += r.alreadyOnList
        skipped += r.skipped
      }
      setMsg({
        type: 'info',
        text: `Added ${added}. ${kept ? `${kept} were already on the list (unsubscribed people stay unsubscribed). ` : ''}${skipped ? `${skipped} invalid or duplicate rows skipped.` : ''}`,
      })
      setFile(null)
      setOptIn(false)
      onDone()
    } catch (err) {
      setMsg({ type: 'error', text: readCallError(err).message })
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <p className={styles.footnote}>
        Moving from Wix?{' '}
        <button type="button" className={styles.linkButton} onClick={() => setOpen(true)}>
          Import the Wix mailing list
        </button>
      </p>
    )
  }
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Import subscribers</h2>
      <p className={styles.muted}>
        In Wix: <strong>Contacts</strong> → filter by <strong>Email subscribers: Subscribed</strong> → <strong>Export</strong> (CSV). Choose that file here. If the file
        has a subscription status column, only people marked “subscribed” are imported. Nobody gets an email when imported.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={pick} aria-label="Choose a CSV file" />
      {file && file.rows.length > 0 && (
        <>
          <p>
            <strong>{file.rows.length}</strong> email addresses found in {file.name}
            {file.notSubscribed ? ` (${file.notSubscribed} not subscribed, left out)` : ''}.
          </p>
          <CheckboxField
            name="optIn"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            label="These people signed up for the Dearly Club newsletter (privacy law only allows emailing people who agreed)."
          />
          <div className={styles.cardActions}>
            <Button onClick={run} disabled={busy}>
              {busy ? 'Importing…' : `Import ${file.rows.length}`}
            </Button>
          </div>
        </>
      )}
      {msg.text && (
        <p className={msg.type === 'error' ? styles.formError : styles.formInfo} role={msg.type === 'error' ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
    </section>
  )
}
