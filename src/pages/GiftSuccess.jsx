import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import styles from './CheckoutSuccess.module.css'

const longDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(navigator.language || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default function GiftSuccess() {
  usePageTitle('Gift sent')
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [gift, setGift] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    try {
      sessionStorage.removeItem('dearly-gift')
    } catch {
      /* ignore */
    }
    import('../lib/firebase')
      .then(({ callFunction }) => callFunction('getCheckoutSummary', { sessionId }))
      .then((data) => alive && setGift(data))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [sessionId])

  const name = gift?.recipientName || 'your recipient'
  const when = gift?.sendOn ? `on ${longDate(gift.sendOn)}` : 'in the next few minutes'

  return (
    <Section tone="blush" className={`${styles.page} under-header`}>
      <Container narrow>
        <Reveal className={styles.card}>
          <Icon name="gift" size={56} className={styles.icon} />
          <Eyebrow>Gift confirmed</Eyebrow>
          <h1 className={styles.title}>
            What a lovely thing to send.
            <br />
            <em>{gift?.months ? `${gift.months} month${gift.months === 1 ? '' : 's'} of letters` : 'Your gift'} for {name}.</em>
          </h1>
          <p className={styles.muted}>
            We'll email the gift card{gift?.recipientEmail ? ` to ${gift.recipientEmail}` : ''} {when}. You'll get a confirmation with the gift code too, so you can pass it on yourself if you prefer.
          </p>
          <div className={styles.actions}>
            <Button to="/gift" size="lg">
              Send another gift
            </Button>
            <Button to="/" variant="outline" size="lg">
              Back to Dearly Club
            </Button>
          </div>
          <p className={styles.muted}>
            Something not right? <Link to="/contact">Contact us</Link>.
          </p>
        </Reveal>
      </Container>
    </Section>
  )
}
