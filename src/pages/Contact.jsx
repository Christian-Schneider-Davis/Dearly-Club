import { useRef, useState } from 'react'
import { contact, contactPage, social } from '../content/site'
import { images } from '../assets/images'
import Field from '../components/forms/Field'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { email, minLength, required, validate } from '../lib/validate'
import styles from './Contact.module.css'

const { fields } = contact

// Same fields and required/optional rules as the original Wix form
const schema = {
  firstName: [required(fields.firstName)],
  email: [email],
  message: [required('message'), minLength(10, 'Your message')],
}

const empty = { firstName: '', lastName: '', email: '', message: '', website: '' }

export default function Contact() {
  usePageTitle('Contact')
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const formRef = useRef(null)

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const found = validate(schema, values)
    setErrors(found)
    const firstBad = Object.keys(found)[0]
    if (firstBad) {
      formRef.current.querySelector(`[name="${firstBad}"]`)?.focus()
      return
    }
    setBusy(true)
    try {
      // Lands in the admin inbox and in Ariane's email. "website" is the hidden
      // honeypot field: the server quietly ignores anything that fills it.
      const { callFunction } = await import('../lib/firebase')
      await callFunction('submitContact', values)
      setSent(true)
    } catch (err) {
      const { fields, message } = readCallError(err)
      if (fields) setErrors(fields)
      setFormError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section className={styles.page}>
      <Container className={styles.layout}>
        <div className={styles.intro}>
          <Reveal>
            <Eyebrow>Get in touch</Eyebrow>
            <h1 className={styles.title}>{contact.heading}</h1>
            <p className={styles.lead}>{contact.intro}</p>
          </Reveal>
          <Reveal delay={100} className={styles.social}>
            {social.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer">
                <Icon name={s.label.toLowerCase()} size={20} />
                <span>
                  {s.label} <span className={styles.handle}>{s.handle}</span>
                </span>
              </a>
            ))}
          </Reveal>
          <Reveal delay={150} className={styles.photo}>
            <ResponsiveImage image={images.letterFlowerSketch} sizes="(min-width: 900px) 40vw, 100vw" />
          </Reveal>
        </div>

        <Reveal delay={80} className={styles.card}>
          {sent ? (
            <div className={styles.sent} role="status">
              <Icon name="letter" size={48} className={styles.sentIcon} />
              <h2 className={styles.sentTitle}>{contactPage.successTitle}</h2>
              <p>{contactPage.success}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setValues(empty)
                  setSent(false)
                }}
              >
                Write another message
              </Button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.form}>
              <div className={styles.row}>
                <Field
                  label={fields.firstName}
                  name="firstName"
                  autoComplete="given-name"
                  required
                  value={values.firstName}
                  onChange={set('firstName')}
                  error={errors.firstName}
                />
                <Field
                  label={fields.lastName}
                  name="lastName"
                  autoComplete="family-name"
                  value={values.lastName}
                  onChange={set('lastName')}
                />
              </div>
              <Field
                label={fields.email}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={set('email')}
                error={errors.email}
              />
              <Field
                as="textarea"
                label={fields.message}
                name="message"
                rows={6}
                required
                value={values.message}
                onChange={set('message')}
                error={errors.message}
              />
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
                </label>
              </div>
              <p className={styles.required}>
                <span aria-hidden="true">*</span> Required
              </p>
              {formError && (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              )}
              <Button type="submit" size="lg" block disabled={busy}>
                {busy ? 'Sending…' : contact.submit}
              </Button>
            </form>
          )}
        </Reveal>
      </Container>
    </Section>
  )
}
