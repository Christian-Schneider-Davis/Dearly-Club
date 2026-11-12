import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../account/Avatar'
import Field from '../components/forms/Field'
import Button from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Layout'
import { penPalCopy as copy } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { callFunction } from '../lib/firebase'
import { db } from '../lib/session'
import ClubGate from './ClubGate'
import styles from './penpals.module.css'

const toDate = (v) => (v?.toDate ? v.toDate() : null)
const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** /dearly-chat/pen-pals — ask for a pen pal, see who you're matched with. */
export default function PenPals() {
  usePageTitle(copy.title, { noindex: true })
  return (
    <ClubGate name={copy.title} access="member">
      {({ user }) => <PenPalHome uid={user.uid} />}
    </ClubGate>
  )
}

function PenPalHome({ uid }) {
  const [state, setState] = useState({ loading: true })
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [req, ms] = await Promise.all([getDoc(doc(db, 'penpalRequests', uid)), getDocs(query(collection(db, 'penpals'), where('members', 'array-contains', uid)))])
    const matches = ms.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (toDate(b.createdAt) ?? 0) - (toDate(a.createdAt) ?? 0))
    setState({ loading: false, request: req.exists() ? req.data() : null, active: matches.find((m) => m.status === 'active'), past: matches.filter((m) => m.status !== 'active') })
  }, [uid])

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setState({ loading: false, error: true })
    })
  }, [load])

  if (state.loading) return <p className={styles.muted}>Loading…</p>
  if (state.error) return <p className={styles.error}>We couldn’t load your pen pals. Please refresh.</p>

  const partnerOf = (m) => m.people?.[m.members.find((x) => x !== uid)] ?? { name: 'Your pen pal' }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <Eyebrow>
          <Link to="/dearly-chat">The Dearly Chat</Link> · Members’ club
        </Eyebrow>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lead}>{copy.intro}</p>
      </header>

      {state.active ? (
        <section className={styles.card}>
          <Avatar name={partnerOf(state.active).name} color={partnerOf(state.active).color} size={64} />
          <div className={styles.cardText}>
            <p className={styles.kicker}>Your pen pal</p>
            <h2 className={styles.cardTitle}>{partnerOf(state.active).name}</h2>
            <p className={styles.muted}>
              {[partnerOf(state.active).country && (regionNames?.of(partnerOf(state.active).country) ?? partnerOf(state.active).country), state.active.languages?.join(', ')].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button to={`/dearly-chat/pen-pals/${state.active.id}`}>Open your chat</Button>
        </section>
      ) : state.request?.status === 'waiting' ? (
        <Waiting request={state.request} onCancelled={load} />
      ) : (
        <RequestForm
          previous={state.request}
          onDone={async (matchId) => {
            if (matchId) navigate(`/dearly-chat/pen-pals/${matchId}`)
            else await load()
          }}
        />
      )}

      <p className={styles.safety}>{copy.safety}</p>

      {state.past?.length > 0 && (
        <section className={styles.past}>
          <h2 className={styles.h3}>Past pen pals</h2>
          <ul>
            {state.past.map((m) => (
              <li key={m.id}>
                <Link to={`/dearly-chat/pen-pals/${m.id}`}>{partnerOf(m).name}</Link>
                <span className={styles.muted}> · ended {toDate(m.endedAt)?.toLocaleDateString() ?? ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Waiting({ request, onCancelled }) {
  const [busy, setBusy] = useState(false)
  const cancel = async () => {
    if (!window.confirm('Stop looking for a pen pal?')) return
    setBusy(true)
    await callFunction('cancelPenPalRequest', {}).catch(() => {})
    await onCancelled()
  }
  return (
    <section className={styles.waiting} role="status">
      <span className={styles.envelope} aria-hidden="true">✉</span>
      <h2 className={styles.cardTitle}>{copy.waitingTitle}</h2>
      <p>{copy.waitingText}</p>
      <ul className={styles.prefs}>
        <li>Writes in: {request.languages?.join(', ')}</li>
        <li>{copy.regions[request.region]}</li>
        <li>{copy.formats[request.format]}</li>
      </ul>
      <button type="button" className={styles.linkButton} onClick={cancel} disabled={busy}>
        Stop looking
      </button>
    </section>
  )
}

function RequestForm({ previous, onDone }) {
  const [v, setV] = useState({
    languages: previous?.languages ?? [],
    region: previous?.region ?? 'anywhere',
    format: previous?.format ?? 'both',
    note: previous?.note ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toggle = (l) => setV((s) => ({ ...s, languages: s.languages.includes(l) ? s.languages.filter((x) => x !== l) : [...s.languages, l] }))

  const submit = async (e) => {
    e.preventDefault()
    if (!v.languages.length) return setError('Choose at least one language you can write in.')
    setBusy(true)
    setError('')
    try {
      const { matchId } = await callFunction('requestPenPal', v)
      await onDone(matchId)
    } catch (err) {
      setError(readCallError(err).message)
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className={styles.cardTitle}>Find a pen pal</h2>
      <fieldset className={styles.fieldset}>
        <legend>I can write in</legend>
        <div className={styles.chips}>
          {copy.languages.map((l) => (
            <button key={l} type="button" aria-pressed={v.languages.includes(l)} className={v.languages.includes(l) ? styles.chipOn : styles.chip} onClick={() => toggle(l)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>I’d like to write to</legend>
        {Object.entries(copy.regions).map(([key, label]) => (
          <label key={key} className={styles.radio}>
            <input type="radio" name="region" value={key} checked={v.region === key} onChange={() => setV((s) => ({ ...s, region: key }))} /> {label}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>How we’ll write</legend>
        {Object.entries(copy.formats).map(([key, label]) => (
          <label key={key} className={styles.radio}>
            <input type="radio" name="format" value={key} checked={v.format === key} onChange={() => setV((s) => ({ ...s, format: key }))} /> {label}
          </label>
        ))}
      </fieldset>
      <Field
        as="textarea"
        label="Anything you’d like your pen pal to know? (optional)"
        name="note"
        rows={3}
        maxLength={300}
        value={v.note}
        onChange={(e) => setV((s) => ({ ...s, note: e.target.value }))}
        hint="Shown to Ariane if she matches you by hand. Don’t include your address."
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? 'Looking…' : 'Find my pen pal'}
      </Button>
    </form>
  )
}
