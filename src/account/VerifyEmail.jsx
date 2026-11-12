import { sendEmailVerification, signOut } from 'firebase/auth'
import { useState } from 'react'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'
import { accountCopy } from '../content/community'
import { auth } from '../lib/session'
import { authMessage, pageUrl } from './links'
import styles from './account.module.css'

/** Shown after a password sign-up until the email is confirmed. */
export default function VerifyEmail({ user, onConfirmed }) {
  usePageTitle('Confirm your email')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const resend = async () => {
    try {
      await sendEmailVerification(user, { url: pageUrl('account') })
      setMsg('Sent again.')
    } catch (err) {
      setMsg(authMessage(err))
    }
  }
  const check = async () => {
    setBusy(true)
    await onConfirmed()
    setBusy(false)
    if (!auth.currentUser?.emailVerified) setMsg('Not confirmed yet — open the link in the email, then try again.')
  }

  return (
    <div className={styles.narrow}>
      <h1 className={styles.title}>Confirm your email</h1>
      <p className={styles.lead}>{accountCopy.verifySent(user.email)}</p>
      <p className={styles.muted}>We ask for this so nobody can make an account with someone else’s email — and so we can recognise your membership.</p>
      <div className={styles.altRow}>
        <Button onClick={check} disabled={busy}>
          I’ve confirmed it
        </Button>
        <button type="button" className={styles.linkButton} onClick={resend}>
          Send the email again
        </button>
        <button type="button" className={styles.linkButton} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      {msg && (
        <p className={styles.muted} role="status">
          {msg}
        </p>
      )}
    </div>
  )
}
