import { collection } from 'firebase/firestore'
import { useState } from 'react'
import usePageTitle from '../../hooks/usePageTitle'
import Button from '../../components/ui/Button'
import Avatar from '../../account/Avatar'
import { readCallError } from '../../lib/callErrors'
import { callFunction } from '../../lib/firebase'
import { db } from '../firebase'
import { countryName, downloadCsv, fmtDate, toDate } from '../format'
import useQuery from '../useQuery'
import { Badge, Detail, Drawer, LoadState, PageHead, Search, Select, matches } from '../ui'
import styles from '../admin.module.css'

/** The Dearly Chat accounts: who joined, free or member, and pausing an account. */
export default function Accounts() {
  usePageTitle('Community accounts')
  const [show, setShow] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const profiles = useQuery(() => collection(db, 'profiles'), [])
  const users = useQuery(() => collection(db, 'users'), [])
  const comp = useQuery(() => collection(db, 'complimentary'), [])
  const lifetime = new Set(comp.rows.map((c) => c.id))

  const byId = Object.fromEntries(users.rows.map((u) => [u.id, u]))
  const rows = profiles.rows
    .map((p) => ({ ...p, private: byId[p.id] ?? {}, lifetime: lifetime.has(byId[p.id]?.email) }))
    .sort((a, b) => (toDate(b.joinedAt) ?? 0) - (toDate(a.joinedAt) ?? 0))
  const visible = rows.filter(
    (r) =>
      (show === 'all' || (show === 'suspended' ? r.suspended : !r.suspended && r.tier === show)) &&
      matches(q, r.displayName, r.private.email, r.country),
  )
  const count = (fn) => rows.filter(fn).length

  const exportCsv = () =>
    downloadCsv('dearly-chat-accounts.csv', [
      ['Name', 'Email', 'Tier', 'Country', 'Joined', 'Paused'],
      ...visible.map((r) => [r.displayName, r.private.email, r.tier, countryName(r.country), fmtDate(r.joinedAt), r.suspended ? 'yes' : '']),
    ])

  const update = (uid, patch) => {
    profiles.setRows((rs) => rs.map((r) => (r.id === uid ? { ...r, ...patch } : r)))
    setOpen((o) => (o?.id === uid ? { ...o, ...patch } : o))
  }

  return (
    <>
      <PageHead
        title="Community accounts"
        intro={`${rows.length} accounts on The Dearly Chat — ${count((r) => r.tier === 'member')} members, ${count((r) => r.tier !== 'member')} free.`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!visible.length}>
            Download CSV
          </Button>
        }
      />
      <LifetimeBox emails={comp.rows} onChanged={() => (comp.reload(), profiles.reload())} />
      <div className={styles.toolbar}>
        <Select
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            ['all', `All (${rows.length})`],
            ['member', `Members (${count((r) => r.tier === 'member' && !r.suspended)})`],
            ['free', `Free (${count((r) => r.tier !== 'member' && !r.suspended)})`],
            ['suspended', `Paused (${count((r) => r.suspended)})`],
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search name, email or country" />
      </div>
      <LoadState loading={profiles.loading || users.loading} error={profiles.error || users.error} empty={!visible.length && 'No accounts here yet.'}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.clickable}`}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Joined</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(r)}>
                  <td>
                    <span className={styles.person}>
                      <Avatar name={r.displayName} color={r.avatarColor} size={32} />
                      <span>
                        <strong>{r.displayName}</strong>
                        <span className={styles.sub}>{r.private.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{countryName(r.country)}</td>
                  <td>{fmtDate(r.joinedAt)}</td>
                  <td>
                    {r.suspended ? (
                      <Badge status="failed" label="paused" />
                    ) : (
                      <Badge status={r.tier === 'member' ? 'active' : 'pending'} label={r.lifetime ? 'lifetime' : r.tier === 'member' ? 'member' : 'free'} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
      {open && (
        <AccountDrawer
          account={{ ...open, lifetime: lifetime.has(open.private.email) }}
          onClose={() => setOpen(null)}
          onChange={update}
          onLifetime={() => (comp.reload(), profiles.reload())}
        />
      )}
    </>
  )
}

/** Give someone a complimentary lifetime membership by email (works before they have an account). */
function LifetimeBox({ emails, onChanged }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const give = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      await callFunction('adminSetLifetime', { email: email.trim(), lifetime: true })
      setMsg({ type: 'info', text: `${email.trim()} now has a lifetime membership.` })
      setEmail('')
      onChanged()
    } catch (err) {
      setMsg({ type: 'error', text: readCallError(err).message })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (address) => {
    if (!window.confirm(`Remove the lifetime membership for ${address}?`)) return
    try {
      await callFunction('adminSetLifetime', { email: address, lifetime: false })
      onChanged()
    } catch (err) {
      window.alert(readCallError(err).message)
    }
  }
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Lifetime memberships</h2>
      <p className={styles.muted}>Free, permanent member access to the Dearly Chat clubs (no subscription needed). Admins always have it. Applies to the account using that email, now or when they join.</p>
      <form className={styles.toolbar} onSubmit={give}>
        <input type="email" className={styles.search} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email for lifetime membership" required />
        <Button type="submit" size="md" disabled={busy || !email.trim()}>
          Give lifetime membership
        </Button>
      </form>
      {msg.text && (
        <p className={msg.type === 'error' ? styles.formError : styles.formInfo} role={msg.type === 'error' ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
      {emails.length > 0 && (
        <ul className={styles.sentList}>
          {emails.map((c) => (
            <li key={c.id}>
              <strong>{c.id}</strong>{' '}
              <button type="button" className={styles.linkButton} onClick={() => remove(c.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AccountDrawer({ account: a, onClose, onChange, onLifetime }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = async () => {
    const suspend = !a.suspended
    if (suspend && !window.confirm(`Pause ${a.displayName}'s account? They'll be signed out and can't sign in until you restore it.`)) return
    setBusy(true)
    setError('')
    try {
      await callFunction('adminSetSuspended', { uid: a.id, suspended: suspend })
      onChange(a.id, { suspended: suspend })
    } catch (err) {
      setError(readCallError(err).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Drawer title={a.displayName} onClose={onClose}>
      <dl className={styles.details}>
        <Detail label="Account">{a.suspended ? 'Paused' : a.lifetime ? 'Lifetime member (complimentary)' : a.tier === 'member' ? 'Member' : 'Free'}</Detail>
        <Detail label="Email">{a.private.email && <a href={`mailto:${a.private.email}`}>{a.private.email}</a>}</Detail>
        <Detail label="Country">{countryName(a.country)}</Detail>
        <Detail label="Joined">{fmtDate(a.joinedAt)}</Detail>
        <Detail label="About">{a.bio && <span className={styles.quote}>{a.bio}</span>}</Detail>
        <Detail label="Interests">{a.interests?.join(', ')}</Detail>
        <Detail label="Guidelines">{a.private.consent && `v${a.private.consent.guidelinesVersion}, 18+ confirmed, ${fmtDate(a.private.consent.at)}`}</Detail>
      </dl>
      <p className={styles.footnote}>Member or free is set automatically from the email: an active or gift membership, a lifetime membership, or being an admin makes it “member”.</p>
      <div className={styles.drawerActions}>
        {a.private.email && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await callFunction('adminSetLifetime', { email: a.private.email, lifetime: !a.lifetime })
                onLifetime()
                onClose()
              } catch (err) {
                setError(readCallError(err).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            {a.lifetime ? 'Remove lifetime membership' : 'Give lifetime membership'}
          </Button>
        )}
        <Button variant={a.suspended ? 'primary' : 'outline'} onClick={toggle} disabled={busy}>
          {a.suspended ? 'Restore account' : 'Pause account'}
        </Button>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
      </div>
    </Drawer>
  )
}
