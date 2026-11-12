import { Route, Routes } from 'react-router-dom'
import { Container, Section } from '../components/ui/Layout'
import AccountHome from './AccountHome'
import AuthPanel from './AuthPanel'
import FinishLink from './FinishLink'
import ProfileForm from './ProfileForm'
import VerifyEmail from './VerifyEmail'
import useSession from './useSession'
import styles from './account.module.css'

/**
 * /account — sign in or create an account, confirm the email, make a profile,
 * then the account home. /account/finish completes an emailed sign-in link.
 */
export default function AccountApp() {
  return (
    <Section className={styles.page}>
      <Container className={styles.container}>
        <Routes>
          <Route path="finish" element={<FinishLink />} />
          <Route path="*" element={<Gate />} />
        </Routes>
      </Container>
    </Section>
  )
}

function Gate() {
  const { user, profile, account, loading, reload } = useSession()

  if (loading) return <p className={styles.muted}>Loading…</p>
  if (!user) return <AuthPanel />
  if (!user.emailVerified) return <VerifyEmail user={user} onConfirmed={reload} />
  if (account?.suspended) {
    return (
      <div className={styles.narrow}>
        <h1 className={styles.title}>Your account is paused</h1>
        <p>Please contact us if you think this is a mistake.</p>
      </div>
    )
  }
  if (!profile) return <ProfileForm isNew email={user.email} onSaved={reload} />
  return <AccountHome user={user} profile={profile} account={account} onChanged={reload} />
}
