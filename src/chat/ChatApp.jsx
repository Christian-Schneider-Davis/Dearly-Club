import { useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Container, Section } from '../components/ui/Layout'
import { rooms } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import useSession from '../account/useSession'
import ChatRoom from './ChatRoom'
import styles from './chat.module.css'

/** /dearly-chat/:room — checks the visitor may use this room, then shows it. */
export default function ChatApp() {
  const { room } = useParams()
  const info = rooms[room]
  usePageTitle(info?.name ?? 'The Dearly Chat', { noindex: true })
  const { user, profile, account, loading, reload } = useSession()

  let gate = null
  if (!info) gate = <Notice title="This chat doesn’t exist" action={<Button to="/dearly-chat">See the clubs</Button>} />
  else if (loading) gate = <p className={styles.muted}>Loading…</p>
  else if (!user || !user.emailVerified || !profile)
    gate = (
      <Notice
        title={`Join ${info.name}`}
        text="Sign in or create a free account to join the conversation."
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
  else if (info.access === 'member' && profile.tier !== 'member')
    gate = (
      <Notice
        title={`${info.name} is for Dearly Members`}
        text={`Members of the mail club can join. Membership is matched by your email (${user.email}).`}
        action={<Button to="/memberships">Become a member</Button>}
      />
    )

  return (
    <Section className={styles.page}>
      <Container>{gate ?? <ChatRoom room={room} info={info} user={user} profile={profile} account={account} onAccountChange={reload} />}</Container>
    </Section>
  )
}

function Notice({ title, text, action }) {
  return (
    <div className={styles.notice}>
      <h1 className={styles.noticeTitle}>{title}</h1>
      {text && <p>{text}</p>}
      {action && <div className={styles.row}>{action}</div>}
    </div>
  )
}
