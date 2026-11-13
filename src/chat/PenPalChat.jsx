import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../account/Avatar'
import MemberBadge from '../components/ui/MemberBadge'
import AddressFields, { addressSchema } from '../components/forms/AddressFields'
import Field, { CheckboxField } from '../components/forms/Field'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { callFunction } from '../lib/firebase'
import { db } from '../lib/session'
import { required, validate } from '../lib/validate'
import ChatRoom from './ChatRoom'
import ClubGate, { Notice } from './ClubGate'
import styles from './penpals.module.css'

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** /dearly-chat/pen-pals/:matchId — private chat with your pen pal + address exchange. */
export default function PenPalChat() {
  usePageTitle('Your pen pal', { noindex: true })
  return (
    <ClubGate name="Pen Pal Match & Chat" access="member">
      {(session) => <Match {...session} />}
    </ClubGate>
  )
}

function Match({ user, profile, account, reload }) {
  const { matchId } = useParams()
  const [match, setMatch] = useState(undefined)

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'penpals', matchId),
        (s) => setMatch(s.exists() ? { id: s.id, ...s.data() } : null),
        () => setMatch(null),
      ),
    [matchId],
  )

  if (match === undefined) return <p className={styles.muted}>Loading…</p>
  if (!match || !match.members?.includes(user.uid)) {
    return <Notice title="This pen-pal chat isn’t available" action={<Button to="/dearly-chat/pen-pals">Back to Pen Pal Match</Button>} />
  }

  const otherUid = match.members.find((m) => m !== user.uid)
  const other = match.people?.[otherUid] ?? { name: 'Your pen pal' }
  const ended = match.status !== 'active'

  return (
    <div className={styles.matchLayout}>
      <ChatRoom
        embedded
        room={`pp_${match.id}`}
        info={{
          name: other.name,
          access: 'member',
          label: 'Pen Pal Match',
          welcome: 'This chat is private between the two of you. Never share your address here — use “Exchange addresses” instead.',
        }}
        user={user}
        profile={profile}
        account={account}
        onAccountChange={reload}
        readOnly={ended ? 'This pen-pal match has ended. The conversation is kept for you to read.' : null}
      />
      <aside className={styles.side}>
        <div className={styles.partner}>
          <Avatar name={other.name} color={other.color} size={56} />
          <div>
            <p className={styles.kicker}>Your pen pal</p>
            <p className={styles.partnerName}>
              {other.name} <MemberBadge size={16} />
            </p>
            <p className={styles.muted}>{[other.country && (regionNames?.of(other.country) ?? other.country), match.languages?.join(', ')].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {!ended && <Addresses match={match} uid={user.uid} otherUid={otherUid} otherName={other.name} />}
        {!ended && <EndMatch matchId={match.id} otherName={other.name} />}
        <Link to="/dearly-chat/pen-pals" className={styles.back}>
          ← Pen Pal Match
        </Link>
      </aside>
    </div>
  )
}

function Addresses({ match, uid, otherUid, otherName }) {
  const offered = Boolean(match.addressOffered?.[uid])
  const theyOffered = Boolean(match.addressOffered?.[otherUid])
  const [theirs, setTheirs] = useState(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (offered) setOpen(false) // form done once the offer is saved
  }, [offered])

  useEffect(() => {
    if (!match.addressesShared) return setTheirs(null)
    getDoc(doc(db, 'penpals', match.id, 'addresses', otherUid))
      .then((s) => setTheirs(s.exists() ? s.data() : null))
      .catch(() => setTheirs(null))
  }, [match.addressesShared, match.id, otherUid])

  const withdraw = async () => {
    if (!window.confirm('Take back your address? It will be deleted from this match.')) return
    try {
      await callFunction('sharePenPalAddress', { matchId: match.id, withdraw: true })
    } catch (err) {
      window.alert(readCallError(err).message)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="addr">
      <h2 id="addr" className={styles.h3}>
        Exchange addresses
      </h2>
      {match.addressesShared && theirs ? (
        <>
          <p className={styles.muted}>You’ve both shared your addresses. Happy writing!</p>
          <address className={styles.envelope2}>
            {[theirs.name, theirs.line1, theirs.line2, [theirs.postalCode, theirs.city].filter(Boolean).join(' '), theirs.state, regionNames?.of(theirs.country) ?? theirs.country]
              .filter(Boolean)
              .map((l) => (
                <span key={l}>{l}</span>
              ))}
          </address>
          <button type="button" className={styles.linkButton} onClick={withdraw}>
            Remove my address
          </button>
        </>
      ) : offered ? (
        <>
          <p>
            You’ve offered your address. {otherName} will see it only once they share theirs too{theyOffered ? '' : ' — we’ll show you theirs here when they do'}.
          </p>
          <button type="button" className={styles.linkButton} onClick={withdraw}>
            Take my offer back
          </button>
        </>
      ) : open ? (
        <AddressForm matchId={match.id} otherName={otherName} onCancel={() => setOpen(false)} />
      ) : (
        <>
          <p className={styles.muted}>
            {theyOffered
              ? `${otherName} would like to exchange addresses. Share yours to see theirs.`
              : `Ready to write real letters? Offer your address. ${otherName} only sees it if they share theirs too.`}
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Share my address
          </Button>
        </>
      )}
    </section>
  )
}

function AddressForm({ matchId, otherName, onCancel }) {
  const [v, setV] = useState({ name: '', line1: '', line2: '', city: '', postalCode: '', state: '', country: '', consent: false })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setV((s) => ({ ...s, [k]: val }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  const submit = async (e) => {
    e.preventDefault()
    const found = validate({ name: [required('name for the envelope')], ...addressSchema(v, required) }, v)
    if (!v.consent) found.consent = 'Please confirm.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setFormError('')
    try {
      const { consent, ...address } = v
      await callFunction('sharePenPalAddress', { matchId, address, consent })
    } catch (err) {
      const { fields, message } = readCallError(err)
      if (fields) setErrors(fields)
      setFormError(message)
      setBusy(false)
    }
  }
  return (
    <form className={styles.addrForm} onSubmit={submit} noValidate>
      <Field label="Name on the envelope" name="name" autoComplete="name" required value={v.name} onChange={set('name')} error={errors.name} />
      <AddressFields values={v} errors={errors} onChange={set} />
      <CheckboxField
        name="consent"
        checked={v.consent}
        onChange={set('consent')}
        error={errors.consent}
        label={`Share this address with ${otherName} so we can write letters. They only see it once they share theirs too.`}
      />
      {formError && (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      )}
      <div className={styles.row}>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Offer my address'}
        </Button>
        <button type="button" className={styles.linkButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function EndMatch({ matchId, otherName }) {
  const navigate = useNavigate()
  const end = async () => {
    if (!window.confirm(`End your pen-pal match with ${otherName}? The chat becomes read-only and any shared addresses are removed. You can then ask for a new pen pal.`)) return
    try {
      await callFunction('endPenPal', { matchId })
      navigate('/dearly-chat/pen-pals')
    } catch (err) {
      window.alert(readCallError(err).message)
    }
  }
  return (
    <button type="button" className={`${styles.linkButton} ${styles.danger}`} onClick={end}>
      End this pen-pal match
    </button>
  )
}
