import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Field from '../components/forms/Field'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'
import { auth } from '../lib/session'
import { authMessage, forgetEmail, recallEmail } from './links'
import styles from './account.module.css'

/** Landing page of the emailed sign-in link. */
export default function FinishLink() {
  usePageTitle('Signing you in')
  const navigate = useNavigate()
  const [email, setEmail] = useState(recallEmail())
  const [needEmail, setNeedEmail] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const started = useRef(false)
  const valid = isSignInWithEmailLink(auth, window.location.href)

  const finish = async (addr) => {
    setBusy(true)
    setError('')
    try {
      await signInWithEmailLink(auth, addr.trim().toLowerCase(), window.location.href)
      forgetEmail()
      navigate('/account', { replace: true })
    } catch (err) {
      setError(authMessage(err))
      setBusy(false)
    }
  }

  useEffect(() => {
    if (started.current || !valid) return
    started.current = true
    // Opened on another device or browser: we don't know the email yet.
    if (email) finish(email)
    else setNeedEmail(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!valid) {
    return (
      <div className={styles.narrow}>
        <h1 className={styles.title}>This link doesn’t work</h1>
        <p>It may be incomplete or already used.</p>
        <Button to="/account">Get a new link</Button>
      </div>
    )
  }

  return (
    <div className={styles.narrow}>
      <h1 className={styles.title}>Signing you in</h1>
      {needEmail ? (
        <form
          className={styles.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            finish(email)
          }}
        >
          <p>For your security, please confirm the email address the link was sent to.</p>
          <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={busy}>
            Continue
          </Button>
        </form>
      ) : (
        busy && <p className={styles.muted}>One moment…</p>
      )}
      {error && (
        <>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <Button to="/account" variant="outline">
            Back to sign in
          </Button>
        </>
      )}
    </div>
  )
}
