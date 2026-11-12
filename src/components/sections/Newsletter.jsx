import { useId, useState } from 'react'
import { home } from '../../content/site'
import { readCallError } from '../../lib/callErrors'
import { roles } from '../../assets/images'
import Reveal from '../motion/Reveal'
import { Container } from '../ui/Layout'
import ResponsiveImage from '../ui/ResponsiveImage'
import styles from './Newsletter.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Mailing-list signup on the envelope-illustration band.
 * Double opt-in: the person gets an email and is only added once they click
 * the link in it (GDPR / CAN-SPAM friendly).
 */
export default function Newsletter() {
  const { newsletter } = home
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  const [website, setWebsite] = useState('') // honeypot: hidden from people, bots fill it

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status.type === 'busy') return
    if (!EMAIL.test(email.trim())) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    if (!consent) {
      setStatus({ type: 'error', message: 'Please tick the box so we can add you to the list.' })
      return
    }
    setStatus({ type: 'busy', message: 'Subscribing…' })
    try {
      const { callFunction } = await import('../../lib/firebase')
      await callFunction('subscribeNewsletter', { email: email.trim(), consent, website })
      setStatus({ type: 'success', message: newsletter.success })
      setEmail('')
      setConsent(false)
    } catch (err) {
      setStatus({ type: 'error', message: readCallError(err).message })
    }
  }

  return (
    <section className={styles.band} aria-labelledby={`${id}-title`}>
      <Container className={styles.inner}>
        <Reveal className={styles.art}>
          <ResponsiveImage image={roles.newsletter} sizes="(min-width: 900px) 420px, 70vw" style={{ objectFit: 'contain' }} />
        </Reveal>

        <Reveal delay={120} className={styles.copy}>
          <p className={styles.intro}>{newsletter.intro}</p>
          <h2 id={`${id}-title`} className={styles.title}>
            {newsletter.heading}
          </h2>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.row}>
              <label htmlFor={`${id}-email`} className="visually-hidden">
                {newsletter.emailLabel}
              </label>
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={`${newsletter.emailLabel} *`}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={status.type === 'error' && !EMAIL.test(email.trim())}
                aria-describedby={`${id}-status`}
                className={styles.input}
              />
              <button type="submit" className={styles.submit} disabled={status.type === 'busy'}>
                {newsletter.button}
              </button>
            </div>
            <div className="visually-hidden" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
            <label className={styles.consent}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{newsletter.consent}</span>
            </label>
            <p id={`${id}-status`} role="status" className={styles.status} data-type={status.type}>
              {status.message}
            </p>
          </form>
        </Reveal>
      </Container>
    </section>
  )
}
