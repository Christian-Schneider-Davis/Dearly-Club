import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { checkoutPage as copy, formatPrice, legalNav, plans } from '../content/site'
import { images } from '../assets/images'
import AddressFields, { addressSchema } from '../components/forms/AddressFields'
import Field, { CheckboxField } from '../components/forms/Field'
import Button from '../components/ui/Button'
import { Container, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { guessCountry } from '../lib/countries'
import { firstLetter } from '../lib/shipping'
import { email, required, validate } from '../lib/validate'
import styles from './Checkout.module.css'

const STORAGE_KEY = 'dearly-checkout'
const empty = {
  firstName: '',
  lastName: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  state: '',
  country: '',
  terms: false,
  renewal: false,
}

// Keep what was typed if the shopper comes back from Stripe without paying.
function loadSaved() {
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'), terms: false, renewal: false }
  } catch {
    return { ...empty }
  }
}

export default function Checkout() {
  usePageTitle('Checkout')
  const [params] = useSearchParams()
  const plan = plans.find((p) => p.id === params.get('plan')) ?? plans[0]
  const isSubscription = plan.mode === 'subscription'
  const cancelled = params.get('cancelled') === '1'

  const [values, setValues] = useState(() => {
    const saved = loadSaved()
    return saved.country ? saved : { ...saved, country: guessCountry() }
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const formRef = useRef(null)

  useEffect(() => {
    try {
      const { terms, renewal, ...rest } = values
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {
      /* storage unavailable: fine */
    }
  }, [values])

  const schema = {
    firstName: [required('first name')],
    lastName: [required('last name')],
    email: [email],
    ...addressSchema(values, required),
    terms: [(v) => (v ? '' : 'Please accept the terms to continue.')],
    ...(isSubscription ? { renewal: [(v) => (v ? '' : 'Please confirm you understand the monthly renewal.')] } : {}),
  }

  const set = (name) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((s) => ({ ...s, [name]: v }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const focusFirstError = (found) => {
    const first = Object.keys(schema).find((k) => found[k])
    if (first) formRef.current?.querySelector(`[name="${first}"]`)?.focus()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validate(schema, values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(found)
      return
    }

    setStatus({ state: 'loading', message: '' })
    try {
      const { callFunction } = await import('../lib/firebase')
      const { url } = await callFunction('createCheckoutSession', {
        plan: plan.id,
        customer: { firstName: values.firstName, lastName: values.lastName, email: values.email },
        shipping: {
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          postalCode: values.postalCode,
          state: values.state,
          country: values.country,
        },
        consent: { terms: values.terms, renewal: values.renewal },
        returnBase: window.location.origin + import.meta.env.BASE_URL,
      })
      window.location.assign(url)
    } catch (err) {
      const { fields, message } = readCallError(err, "We couldn't reach the payment page. Please try again in a moment.")
      if (fields) {
        setErrors(fields)
        focusFirstError(fields)
      }
      setStatus({ state: 'error', message })
    }
  }

  const loading = status.state === 'loading'
  const terms = legalNav.find((l) => l.to === '/legal/terms')
  const shippingPolicy = legalNav.find((l) => l.to === '/legal/shipping-returns')

  return (
    <Section className={styles.page}>
      <Container>
        <ol className={styles.steps} aria-label="Checkout steps">
          <li aria-current="step">1 · Your details</li>
          <li>2 · Secure payment</li>
          <li>3 · Confirmation</li>
        </ol>

        <div className={styles.layout}>
          <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.form} aria-busy={loading}>
            <div>
              <h1 className={styles.title}>{copy.heading}</h1>
              <p className={styles.intro}>{copy.intro}</p>
            </div>

            {cancelled && (
              <p className={styles.notice} role="status">
                {copy.cancelledNote}
              </p>
            )}

            <fieldset className={styles.group}>
              <legend>About you</legend>
              <div className={styles.row}>
                <Field label="First name" name="firstName" autoComplete="given-name" required value={values.firstName} onChange={set('firstName')} error={errors.firstName} />
                <Field label="Last name" name="lastName" autoComplete="family-name" required value={values.lastName} onChange={set('lastName')} error={errors.lastName} />
              </div>
              <Field
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                hint="For your receipt and delivery updates."
                value={values.email}
                onChange={set('email')}
                error={errors.email}
              />
            </fieldset>

            <fieldset className={styles.group}>
              <legend>Shipping address</legend>
              <AddressFields values={values} errors={errors} onChange={set} />
            </fieldset>

            <fieldset className={styles.group}>
              <legend className="visually-hidden">Agreements</legend>
              <CheckboxField
                name="terms"
                checked={values.terms}
                onChange={set('terms')}
                error={errors.terms}
                label={
                  <>
                    I agree to the <Link to={terms.to}>Terms &amp; Conditions</Link> and the{' '}
                    <Link to={shippingPolicy.to}>Shipping, Returns &amp; Cancellation</Link> policy. <span className={styles.req}>*</span>
                  </>
                }
              />
              {isSubscription && (
                <CheckboxField
                  name="renewal"
                  checked={values.renewal}
                  onChange={set('renewal')}
                  error={errors.renewal}
                  label={
                    <>
                      {copy.renewalLabel} <span className={styles.req}>*</span>
                    </>
                  }
                />
              )}
            </fieldset>

            {status.state === 'error' && (
              <p className={styles.error} role="alert">
                {status.message}
              </p>
            )}

            <Button type="submit" size="lg" block disabled={loading}>
              {loading ? 'Opening secure payment…' : copy.submit}
            </Button>
            <p className={styles.stripe}>{copy.stripeNote}</p>
          </form>

          <aside className={styles.summary} aria-label="Order summary">
            <p className={styles.summaryLabel}>Your order</p>
            <div className={styles.item}>
              <ResponsiveImage image={images.flowerCardPressedFlowers} sizes="72px" className={styles.thumb} />
              <div>
                <p className={styles.itemName}>{plan.name}</p>
                <p className={styles.itemMeta}>{isSubscription ? 'Monthly subscription' : 'One time purchase'}</p>
              </div>
              <Link to={`/memberships${plan.id === 'member' ? '' : `?plan=${plan.id}`}`} className={styles.change}>
                Change
              </Link>
            </div>
            <dl className={styles.lines}>
              <div>
                <dt>{isSubscription ? 'Membership' : 'One month'}</dt>
                <dd>{formatPrice(plan.priceCents, { locale: 'en-IE' })}</dd>
              </div>
              <div>
                <dt>Shipping, worldwide</dt>
                <dd>Included</dd>
              </div>
              <div className={styles.muted}>
                <dt>VAT / sales tax</dt>
                <dd>Calculated from your address</dd>
              </div>
            </dl>
            <div className={styles.total}>
              <span>Due today</span>
              <span className={styles.totalAmount}>{formatPrice(plan.priceCents)} + tax</span>
            </div>
            {isSubscription && <p className={styles.then}>Then {formatPrice(plan.priceCents)} + tax each month. Skip or cancel anytime.</p>}
            <p className={styles.then}>
              Your first letter: <strong>{firstLetter().letterMonth}</strong>, posted 20–25 {firstLetter().postedMonth}.
            </p>
            <p className={styles.duties}>Outside the EU, your country may charge import duties on delivery.</p>
          </aside>
        </div>
      </Container>
    </Section>
  )
}
