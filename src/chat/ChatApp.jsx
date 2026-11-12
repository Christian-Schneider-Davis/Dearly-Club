import { useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Container, Section } from '../components/ui/Layout'
import { rooms } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import ChatRoom from './ChatRoom'
import ClubGate, { Notice } from './ClubGate'
import styles from './chat.module.css'

/** /dearly-chat/:room — a group chat room (The Dearly Club). */
export default function ChatApp() {
  const { room } = useParams()
  const info = rooms[room]
  usePageTitle(info?.name ?? 'The Dearly Chat', { noindex: true })
  if (!info) {
    return (
      <Section className={styles.page}>
        <Container>
          <Notice title="This chat doesn’t exist" action={<Button to="/dearly-chat">See the clubs</Button>} />
        </Container>
      </Section>
    )
  }
  return (
    <ClubGate name={info.name} access={info.access}>
      {({ user, profile, account, reload }) => <ChatRoom room={room} info={info} user={user} profile={profile} account={account} onAccountChange={reload} />}
    </ClubGate>
  )
}
