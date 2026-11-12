import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Field from '../components/forms/Field'
import Button from '../components/ui/Button'
import Logo from '../components/ui/Logo'
import usePageTitle from '../hooks/usePageTitle'
import { auth } from './firebase'
import styles from './admin.module.css'

const MESSAGES = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/invalid-email': 'Please enter a valid email.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
}

export default function Login({ notice, onReset }) {
  usePageTitle('Admin sign in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(MESSAGES[err.code] ?? 'Could not sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setError('')
    if (!email.trim()) {
      setError('Enter your email above first, then click “Forgot password”.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch {
      // Same message either way, so the form never reveals which emails have accounts.
    }
    setInfo('If that email has an admin account, a reset link is on its way.')
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <Logo size={72} className={styles.loginLogo} />
        <h1 className={styles.loginTitle}>Dearly Club admin</h1>
        {notice ? (
          <>
            <p className={styles.notice} role="alert">
              {notice}
            </p>
            <Button block onClick={onReset}>
              Sign out
            </Button>
          </>
        ) : (
          <form onSubmit={submit} noValidate className={styles.loginForm}>
            <Field label="Email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className={styles.formInfo} role="status">
                {info}
              </p>
            )}
            <Button type="submit" block disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <button type="button" className={styles.linkButton} onClick={reset}>
              Forgot password?
            </button>
          </form>
        )}
        <Link to="/" className={styles.backLink}>
          ← Back to the website
        </Link>
      </div>
    </main>
  )
}
