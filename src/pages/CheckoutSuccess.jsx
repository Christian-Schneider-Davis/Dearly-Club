import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice, plans } from '../content/site'
import { roles } from '../assets/images'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import styles from './CheckoutSuccess.module.css'

const regionName = (code) => {
  try {
    return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(code)
  } catch {
    return code
  }
}

export default function CheckoutSuccess() {
  usePageTitle('Thank you')
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState(sessionId ? 'loading' : 'missing')

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    try {
      sessionStorage.removeItem('dearly-checkout')
    } catch {
      /* ignore */
    }
    import('../lib/firebase')
      .then(({ callFunction }) => callFunction('getCheckoutSummary', { sessionId }))
      .then((data) => {
        if (!alive) return
        setSummary(data)
        setState('ready')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [sessionId])

  const plan = plans.find((p) => p.id === summary?.plan)
  const isMember = summary?.plan === 'member'

  return (
    <Section className={styles.page}>
      <Container className={styles.layout}>
        <Reveal className={styles.card}>
          <Icon name="letter" size={56} className={styles.icon} />
          <Eyebrow>{state === 'ready' && !summary?.paid ? 'Payment processing' : 'Order confirmed'}</Eyebrow>
          <h1 className={styles.title}>
            {summary?.firstName ? `Thank you, ${summary.firstName}.` : 'Thank you.'}
            <br />
            <em>Your first letter is on its way.</em>
          </h1>

          {state === 'loading' && <p className={styles.muted}>Loading your order…</p>}

          {state === 'ready' && (
            <>
              <dl className={styles.details}>
                {plan && (
                  <div>
                    <dt>Plan</dt>
                    <dd>{plan.name}{isMember ? ' · monthly' : ' · one time'}</dd>
                  </div>
                )}
                {summary.city && (
                  <div>
                    <dt>Shipping to</dt>
                    <dd>
                      {summary.city}, {regionName(summary.country)}
                    </dd>
                  </div>
                )}
                {summary.total != null && (
                  <div>
                    <dt>Paid today</dt>
                    <dd>
                      {formatPrice(summary.total, { currency: (summary.currency || 'eur').toUpperCase() })}
                      {summary.tax ? ` (incl. ${formatPrice(summary.tax, { currency: (summary.currency || 'eur').toUpperCase() })} tax)` : ''}
                    </dd>
                  </div>
                )}
              </dl>
              {summary.email && <p className={styles.muted}>A receipt is on its way to {summary.email}.</p>}
            </>
          )}

          {(state === 'error' || state === 'missing') && (
            <p className={styles.muted}>Your payment went through and a receipt is on its way to your inbox.</p>
          )}

          {isMember && (
            <p className={styles.muted}>
              You can update your address, skip a month or cancel anytime from <Link to="/manage">Manage membership</Link>.
            </p>
          )}

          <div className={styles.actions}>
            <Button to="/" size="lg">
              Back to Dearly Club
            </Button>
            <Button to="/dearly-chat" variant="outline" size="lg">
              Meet the community
            </Button>
          </div>
        </Reveal>

        <Reveal delay={150} className={styles.photo}>
          <ResponsiveImage image={roles.heroTall} sizes="(min-width: 900px) 40vw, 100vw" />
        </Reveal>
      </Container>
    </Section>
  )
}
