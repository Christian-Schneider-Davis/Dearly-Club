import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { redeemPage as copy } from '../content/site'
import { images } from '../assets/images'
import AddressFields, { addressSchema } from '../components/forms/AddressFields'
import Field, { CheckboxField } from '../components/forms/Field'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { guessCountry } from '../lib/countries'
import { firstLetter } from '../lib/shipping'
import { email, required, validate } from '../lib/validate'
import styles from './Redeem.module.css'

const CODE = /^(DEAR)?[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/

export default function Redeem() {
  usePageTitle('Redeem a Gift')
  const [params] = useSearchParams()
  const [values, setValues] = useState(() => ({
    code: params.get('code') ?? '',
    firstName: '',
    lastName: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    state: '',
    country: guessCountry(),
    terms: false,
  }))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const [done, setDone] = useState(null)
  const formRef = useRef(null)

  const schema = {
    code: [(v) => (CODE.test(String(v).toUpperCase().replace(/[^A-Z0-9]/g, '')) ? '' : 'Please check your gift code (it looks like DEAR-XXXX-XXXX).')],
    firstName: [required('first name')],
    lastName: [required('last name')],
    email: [email],
    ...addressSchema(values, required),
    terms: [(v) => (v ? '' : 'Please accept the terms to continue.')],
  }

  const set = (name) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((s) => ({ ...s, [name]: v }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const focusFirst = (found) => {
    const first = Object.keys(schema).find((k) => found[k])
    if (first) formRef.current?.querySelector(`[name="${first}"]`)?.focus()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validate(schema, values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirst(found)
      return
    }
    setStatus({ state: 'loading', message: '' })
    try {
      const { callFunction } = await import('../lib/firebase')
      const result = await callFunction('redeemGift', {
        code: values.code,
        customer: { firstName: values.firstName, lastName: values.lastName, email: values.email },
        shipping: {
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          postalCode: values.postalCode,
          state: values.state,
          country: values.country,
        },
        consent: { terms: values.terms },
      })
      setDone(result)
      setStatus({ state: 'idle', message: '' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const { fields, message } = readCallError(err)
      if (fields) {
        setErrors(fields)
        focusFirst(fields)
      }
      setStatus({ state: 'error', message })
    }
  }

  if (done) {
    return (
      <Section tone="blush" className={`${styles.page} under-header`}>
        <Container narrow>
          <Reveal className={styles.done} role="status">
            <Icon name="letter" size={56} className={styles.icon} />
            <Eyebrow>Gift redeemed</Eyebrow>
            <h1 className={styles.title}>
              Welcome to Dearly Club, {done.firstName}.
              <br />
              <em>Your {done.months} months of letters begin now.</em>
            </h1>
            <p className={styles.lead}>
              Your first letter is {firstLetter().letterMonth}'s, posted 20–25 {firstLetter().postedMonth}. We've emailed you a confirmation with your delivery address.
            </p>
            <div className={styles.actions}>
              <Button to="/dearly-chat" size="lg">
                Meet the community
              </Button>
              <Button to="/about" variant="outline" size="lg">
                Read Ariane's letter
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>
    )
  }

  const loading = status.state === 'loading'

  return (
    <Section tone="blush" className={`${styles.page} under-header`}>
      <Container className={styles.layout}>
        <div className={styles.side}>
          <Reveal>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 className={styles.title}>{copy.heading}</h1>
            <p className={styles.lead}>{copy.intro}</p>
          </Reveal>
          <Reveal delay={120} className={styles.photo}>
            <ResponsiveImage image={images.purpleWatercolour2} sizes="(min-width: 900px) 40vw, 100vw" />
          </Reveal>
        </div>

        <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.form} aria-busy={loading}>
          <Field
            label="Gift code"
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="DEAR-XXXX-XXXX"
            value={values.code}
            onChange={set('code')}
            error={errors.code}
            className={styles.code}
          />

          <fieldset className={styles.group}>
            <legend>About you</legend>
            <div className={styles.row}>
              <Field label="First name" name="firstName" autoComplete="given-name" required value={values.firstName} onChange={set('firstName')} error={errors.firstName} />
              <Field label="Last name" name="lastName" autoComplete="family-name" required value={values.lastName} onChange={set('lastName')} error={errors.lastName} />
            </div>
            <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required value={values.email} onChange={set('email')} error={errors.email} />
          </fieldset>

          <fieldset className={styles.group}>
            <legend>Where should we send your letters?</legend>
            <AddressFields values={values} errors={errors} onChange={set} />
          </fieldset>

          <CheckboxField
            name="terms"
            checked={values.terms}
            onChange={set('terms')}
            error={errors.terms}
            label={
              <>
                I agree to the <Link to="/legal/terms">Terms &amp; Conditions</Link>. <span className={styles.req}>*</span>
              </>
            }
          />

          {status.state === 'error' && (
            <p className={styles.error} role="alert">
              {status.message}
            </p>
          )}

          <Button type="submit" size="lg" block disabled={loading}>
            {loading ? 'Redeeming…' : copy.submit}
          </Button>
        </form>
      </Container>
    </Section>
  )
}
