import Button from '../components/ui/Button'
import { Container, Section } from '../components/ui/Layout'
import useSession from '../account/useSession'
import styles from './chat.module.css'

/**
 * Wraps a Dearly Chat page: shows sign-in / members-only notices, otherwise
 * renders children(session). access: 'free' | 'member'.
 */
export default function ClubGate({ name, access, children }) {
  const session = useSession()
  const { user, profile, account, loading } = session
  let gate = null
  if (loading) gate = <p className={styles.muted}>Loading…</p>
  else if (!user || !user.emailVerified || !profile)
    gate = (
      <Notice
        title={`Join ${name}`}
        text={access === 'member' ? 'Sign in with the email you use for your Dearly Club membership.' : 'Sign in or create a free account to join the conversation.'}
        action={
          <>
            <Button to="/account?mode=signup">Create a free account</Button>
            <Button to="/account" variant="outline">
              Sign in
            </Button>
          </>
        }
      />
    )
  else if (account?.suspended || profile.suspended) gate = <Notice title="Your account is paused" text="Please contact us if you think this is a mistake." />
  else if (access === 'member' && profile.tier !== 'member')
    gate = (
      <Notice
        title={`${name} is for Dearly Members`}
        text={`Members of the mail club can join. Membership is matched by your email (${user.email}) — check it from your account page if you’re already a member.`}
        action={
          <>
            <Button to="/memberships">Become a member</Button>
            <Button to="/account" variant="outline">
              Your account
            </Button>
          </>
        }
      />
    )

  return (
    <Section className={styles.page}>
      <Container>{gate ?? children(session)}</Container>
    </Section>
  )
}

export function Notice({ title, text, action }) {
  return (
    <div className={styles.notice}>
      <h1 className={styles.noticeTitle}>{title}</h1>
      {text && <p>{text}</p>}
      {action && <div className={styles.row}>{action}</div>}
    </div>
  )
}
