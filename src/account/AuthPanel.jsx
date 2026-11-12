import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, sendSignInLinkToEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Field from '../components/forms/Field'
import Button from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Layout'
import { accountCopy as copy } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import { auth } from '../lib/session'
import { authMessage, pageUrl, rememberEmail } from './links'
import styles from './account.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Sign in / create account. Default: emailed link (no password). Optional: password. */
export default function AuthPanel() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [usePassword, setUsePassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  usePageTitle(mode === 'signup' ? 'Create an account' : 'Sign in')

  const check = () => {
    if (!EMAIL.test(email.trim())) return 'Please enter a valid email address.'
    if (usePassword && password.length < (mode === 'signup' ? 8 : 1)) return mode === 'signup' ? 'Choose a password of at least 8 characters.' : 'Enter your password.'
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const problem = check()
    setError(problem)
    if (problem) return
    const addr = email.trim().toLowerCase()
    setBusy(true)
    try {
      if (!usePassword) {
        await sendSignInLinkToEmail(auth, addr, { url: pageUrl('account/finish'), handleCodeInApp: true })
        rememberEmail(addr)
        setSent(copy.linkSent(addr))
      } else if (mode === 'signup') {
        const { user } = await createUserWithEmailAndPassword(auth, addr, password)
        await sendEmailVerification(user, { url: pageUrl('account') })
      } else {
        await signInWithEmailAndPassword(auth, addr, password)
      }
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!EMAIL.test(email.trim())) return setError('Enter your email above first.')
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase(), { url: pageUrl('account') })
    } catch {
      // Same message either way, so this never reveals who has an account.
    }
    setSent(`If ${email.trim()} has an account with a password, a reset link is on its way.`)
  }

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setSent('')
  }

  return (
    <div className={styles.authCard}>
      <div className={styles.tabs} role="tablist" aria-label="Account">
        {[
          ['signin', 'Sign in'],
          ['signup', 'Create account'],
        ].map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? styles.tabActive : styles.tab} onClick={() => switchMode(m)}>
            {label}
          </button>
        ))}
      </div>

      <Eyebrow>The Dearly Chat</Eyebrow>
      <h1 className={styles.title}>{mode === 'signup' ? copy.signUpTitle : copy.signInTitle}</h1>
      {mode === 'signup' && <p className={styles.lead}>{copy.signUpIntro}</p>}

      {sent ? (
        <div className={styles.sent} role="status">
          <p>{sent}</p>
          <button type="button" className={styles.linkButton} onClick={() => setSent('')}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className={styles.form}>
          <Field label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {usePassword && (
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? 'One moment…' : usePassword ? (mode === 'signup' ? 'Create account' : 'Sign in') : 'Email me a sign-in link'}
          </Button>
          <div className={styles.altRow}>
            <button type="button" className={styles.linkButton} onClick={() => (setUsePassword((v) => !v), setError(''))}>
              {usePassword ? 'Email me a link instead (no password)' : 'Use a password instead'}
            </button>
            {usePassword && mode === 'signin' && (
              <button type="button" className={styles.linkButton} onClick={reset}>
                Forgot password?
              </button>
            )}
          </div>
        </form>
      )}
      <p className={styles.fine}>
        By creating an account you confirm you’re 18 or older. See our <Link to="/legal/community-guidelines">Community Guidelines</Link> and{' '}
        <Link to="/legal/privacy">Privacy Policy</Link>.
      </p>
    </div>
  )
}
