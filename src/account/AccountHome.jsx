import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Layout'
import { clubs, stripeLinks } from '../content/site'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { callFunction } from '../lib/firebase'
import { auth, db } from '../lib/session'
import Avatar from './Avatar'
import ProfileForm from './ProfileForm'
import styles from './account.module.css'

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

export default function AccountHome({ user, profile, account, onChanged }) {
  usePageTitle('Your account')
  const [editing, setEditing] = useState(false)
  const [checking, setChecking] = useState('')
  const isMember = profile.tier === 'member'

  if (editing) {
    return (
      <ProfileForm
        initial={profile}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          await onChanged()
          setEditing(false)
        }}
      />
    )
  }

  const recheck = async () => {
    setChecking('Checking…')
    try {
      const { tier } = await callFunction('refreshMembership', {})
      await onChanged()
      setChecking(tier === 'member' ? 'Found your membership — welcome!' : `No active membership found for ${user.email}.`)
    } catch (err) {
      setChecking(readCallError(err).message)
    }
  }

  return (
    <div className={styles.home}>
      <section className={styles.profileCard} aria-labelledby="me">
        <Avatar name={profile.displayName} color={profile.avatarColor} size={88} />
        <div className={styles.profileText}>
          <Eyebrow>{isMember ? 'Dearly Member' : 'Free account'}</Eyebrow>
          <h1 id="me" className={styles.title}>
            {profile.displayName}
          </h1>
          {profile.country && <p className={styles.muted}>{regionNames?.of(profile.country) ?? profile.country}</p>}
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          {profile.interests?.length > 0 && (
            <ul className={styles.tagList} aria-label="Interests">
              {profile.interests.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          <div className={styles.altRow}>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="clubs">
        <h2 id="clubs" className={styles.panelTitle}>
          Your clubs
        </h2>
        <ul className={styles.clubList}>
          {clubs.map((c) => {
            const open = c.access === 'free' || isMember
            return (
              <li key={c.id} className={open ? styles.clubOpen : styles.clubLocked}>
                <div>
                  <h3>{c.name}</h3>
                  <p className={styles.muted}>{c.blurb}</p>
                </div>
                {open ? (
                  <Button to={c.path} size="md">
                    Open
                  </Button>
                ) : (
                  <span className={styles.clubStatus}>Members only</span>
                )}
              </li>
            )
          })}
        </ul>
        {!isMember && (
          <div className={styles.memberNudge}>
            <p>
              Already a member of the mail club? Membership is matched by email — make sure this account uses <strong>{user.email}</strong>, the same address
              you joined with.
            </p>
            <div className={styles.altRow}>
              <Button to="/memberships">Become a member</Button>
              <button type="button" className={styles.linkButton} onClick={recheck}>
                Check my membership again
              </button>
            </div>
            {checking && (
              <p className={styles.muted} role="status">
                {checking}
              </p>
            )}
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="settings">
        <h2 id="settings" className={styles.panelTitle}>
          Account
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Mail club</dt>
            <dd>
              {isMember ? 'Active membership' : 'No active membership'}
              {isMember && (stripeLinks.portalLoginUrl ? <> · <a href={stripeLinks.portalLoginUrl}>Manage membership</a></> : <> · <Link to="/manage">Manage membership</Link></>)}
            </dd>
          </div>
        </dl>
        <div className={styles.altRow}>
          <Button variant="outline" onClick={() => signOut(auth)}>
            Sign out
          </Button>
        </div>
        {account?.blocked?.length > 0 && <BlockedList uids={account.blocked} onChanged={onChanged} />}
        <DeleteAccount />
      </section>
      {account?.consent && <p className={styles.fine}>You accepted the Community Guidelines (version {account.consent.guidelinesVersion}).</p>}
    </div>
  )
}

function BlockedList({ uids, onChanged }) {
  const [names, setNames] = useState({})
  const [busy, setBusy] = useState('')
  useEffect(() => {
    Promise.all(uids.map((u) => getDoc(doc(db, 'profiles', u)).then((s) => [u, s.data()?.displayName ?? 'Former member']).catch(() => [u, 'Member'])))
      .then((pairs) => setNames(Object.fromEntries(pairs)))
  }, [uids])
  const unblock = async (uid) => {
    setBusy(uid)
    try {
      await callFunction('blockMember', { uid, block: false })
      await onChanged()
    } finally {
      setBusy('')
    }
  }
  return (
    <div className={styles.blocked}>
      <h3>Blocked members</h3>
      <ul>
        {uids.map((u) => (
          <li key={u}>
            <span>{names[u] ?? '…'}</span>
            <button type="button" className={styles.linkButton} onClick={() => unblock(u)} disabled={busy === u}>
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) {
    return (
      <button type="button" className={`${styles.linkButton} ${styles.danger}`} onClick={() => setOpen(true)}>
        Delete my account
      </button>
    )
  }
  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await callFunction('deleteAccount', { confirm: text.trim().toUpperCase() })
      await signOut(auth).catch(() => {})
    } catch (err) {
      setError(readCallError(err).message)
      setBusy(false)
    }
  }
  return (
    <div className={styles.dangerBox}>
      <p>
        This deletes your Dearly Chat account and profile for good. It doesn’t cancel a mail club membership — do that from <Link to="/manage">Manage membership</Link>.
      </p>
      <label className={styles.inlineLabel}>
        Type <strong>DELETE</strong> to confirm
        <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={styles.input} />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.altRow}>
        <Button onClick={run} disabled={busy || text.trim().toUpperCase() !== 'DELETE'} className={styles.dangerButton}>
          {busy ? 'Deleting…' : 'Delete account'}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setOpen(false)}>
          Keep my account
        </button>
      </div>
    </div>
  )
}
