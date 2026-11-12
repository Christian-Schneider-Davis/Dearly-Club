import { Link } from 'react-router-dom'
import { stripeLinks } from '../content/site'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import styles from './ManageMembership.module.css'

const things = [
  { icon: 'letter', title: 'Update your address', text: 'Moving? Change where your letters go before the next shipment.' },
  { icon: 'ritual', title: 'Skip or cancel', text: 'Cancel anytime. Your membership stays active until the end of the month you paid for.' },
  { icon: 'postcard', title: 'Card & receipts', text: 'Change your payment card and download past receipts.' },
]

/**
 * Members manage their subscription in Stripe's secure portal. They enter
 * their email and Stripe sends them a one-time sign-in link — no password.
 */
export default function ManageMembership() {
  usePageTitle('Manage membership')
  const url = stripeLinks.portalLoginUrl

  return (
    <Section className={styles.page}>
      <Container narrow>
        <Reveal className={styles.head}>
          <Eyebrow>Members</Eyebrow>
          <h1 className={styles.title}>Manage your membership</h1>
          <p className="lead">
            Enter the email you joined with and we'll send you a secure link. No password needed.
          </p>
        </Reveal>

        <ul className={styles.list}>
          {things.map((t, i) => (
            <Reveal as="li" key={t.title} delay={i * 80} className={styles.item}>
              <Icon name={t.icon} size={32} className={styles.icon} />
              <div>
                <h2 className={styles.itemTitle}>{t.title}</h2>
                <p>{t.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal className={styles.cta}>
          {url ? (
            <Button href={url} size="lg" target="_blank" rel="noreferrer">
              Open my membership
            </Button>
          ) : (
            <p className={styles.soon}>Member self-service opens when the new store launches.</p>
          )}
          <p className={styles.help}>
            Trouble signing in? <Link to="/contact">Contact us</Link> and we'll help. Within 14 days of your first letter?{' '}
            <Link to="/legal/withdraw">Withdraw from contract here</Link>.
          </p>
        </Reveal>
      </Container>
    </Section>
  )
}
