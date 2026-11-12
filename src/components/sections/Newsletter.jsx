import { useId, useState } from 'react'
import { home } from '../../content/site'
import { roles } from '../../assets/images'
import Reveal from '../motion/Reveal'
import { Container } from '../ui/Layout'
import ResponsiveImage from '../ui/ResponsiveImage'
import styles from './Newsletter.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Mailing-list signup on the envelope-illustration band.
 * The form validates now; it is connected to the email service in Phase 8.
 */
export default function Newsletter() {
  const { newsletter } = home
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  const onSubmit = (e) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    if (!consent) {
      setStatus({ type: 'error', message: 'Please tick the box so we can add you to the list.' })
      return
    }
    // TODO (Phase 8): send to the newsletter provider (double opt-in).
    setStatus({ type: 'preview', message: 'Thank you! Sign-ups go live when the new site launches.' })
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
              <button type="submit" className={styles.submit}>
                {newsletter.button}
              </button>
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
