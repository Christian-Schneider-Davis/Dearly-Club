import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Field from '../components/forms/Field'
import Button from '../components/ui/Button'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { email, required, validate } from '../lib/validate'
import styles from './Withdraw.module.css'

const SUBJECTS = [
  { id: 'membership', label: 'Dearly Member subscription' },
  { id: 'letter', label: 'Dearly Guest letter' },
  { id: 'gift', label: 'Gift membership' },
]

const schema = {
  name: [required('name')],
  email: [email],
  subject: [(v) => (v ? '' : 'Choose what you are withdrawing from.')],
}

/**
 * EU withdrawal function ("withdraw from contract here"): fill in → review →
 * confirm. On confirmation we show and email the time we received it.
 */
export default function Withdraw() {
  usePageTitle('Withdraw from contract')
  const [values, setValues] = useState({ name: '', email: '', subject: '', orderDate: '', reference: '', note: '' })
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState('form') // form → review → done
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const [receipt, setReceipt] = useState(null)
  const formRef = useRef(null)

  const set = (name) => (e) => {
    setValues((s) => ({ ...s, [name]: e.target.value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const toReview = (e) => {
    e.preventDefault()
    const found = validate(schema, values)
    setErrors(found)
    const first = Object.keys(schema).find((k) => found[k])
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus()
      return
    }
    setStep('review')
    window.scrollTo({ top: 0 })
  }

  const confirm = async () => {
    setStatus({ state: 'loading', message: '' })
    try {
      const { callFunction } = await import('../lib/firebase')
      const res = await callFunction('submitWithdrawal', { ...values, confirmed: true })
      setReceipt(res)
      setStep('done')
      setStatus({ state: 'idle', message: '' })
      window.scrollTo({ top: 0 })
    } catch (err) {
      const { message } = readCallError(err, `We couldn't send your withdrawal right now. Please try again, or email us. It counts from the moment you send it.`)
      setStatus({ state: 'error', message })
    }
  }

  const subjectLabel = SUBJECTS.find((s) => s.id === values.subject)?.label

  return (
    <Section className={styles.page}>
      <Container narrow>
        <Eyebrow>Your right of withdrawal</Eyebrow>
        <h1 className={styles.title}>Withdraw from contract</h1>

        {step === 'form' && (
          <>
            <p className={styles.lead}>
              EU and UK consumers can withdraw within 14 days, without giving a reason: from receiving the first letter for letters and memberships, or from purchase for an unredeemed gift. We refund you in full within 14 days, and you don't need to send anything back.{' '}
              <Link to="/legal/shipping-returns">Read the details</Link>.
            </p>
            <p className={styles.lead}>
              Just want to stop future payments? You can also <Link to="/manage">cancel your membership</Link> anytime.
            </p>

            <form ref={formRef} onSubmit={toReview} noValidate className={styles.form}>
              <fieldset className={styles.subjects}>
                <legend className={styles.legend}>
                  What are you withdrawing from? <span className={styles.req}>*</span>
                </legend>
                {SUBJECTS.map((s) => (
                  <label key={s.id} className={styles.subject} data-checked={values.subject === s.id}>
                    <input type="radio" name="subject" value={s.id} checked={values.subject === s.id} onChange={set('subject')} />
                    <span>{s.label}</span>
                  </label>
                ))}
                {errors.subject && <p className={styles.fieldError}>{errors.subject}</p>}
              </fieldset>
              <div className={styles.row}>
                <Field label="Your name" name="name" autoComplete="name" required value={values.name} onChange={set('name')} error={errors.name} />
                <Field label="Email used for the order" name="email" type="email" autoComplete="email" required value={values.email} onChange={set('email')} error={errors.email} />
              </div>
              <div className={styles.row}>
                <Field label="Ordered or received on (optional)" name="orderDate" type="date" value={values.orderDate} onChange={set('orderDate')} />
                <Field label="Order reference or gift code (optional)" name="reference" value={values.reference} onChange={set('reference')} />
              </div>
              <Field as="textarea" label="Anything else? (optional)" name="note" rows={3} maxLength={1000} value={values.note} onChange={set('note')} />
              <Button type="submit" size="lg" block>
                Review my withdrawal
              </Button>
            </form>
          </>
        )}

        {step === 'review' && (
          <div className={styles.review}>
            <p className={styles.lead}>Please check your withdrawal, then confirm to send it.</p>
            <blockquote className={styles.statement}>I hereby withdraw from my contract for the following: {subjectLabel}.</blockquote>
            <dl className={styles.details}>
              <div>
                <dt>Name</dt>
                <dd>{values.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{values.email}</dd>
              </div>
              {values.orderDate && (
                <div>
                  <dt>Ordered or received on</dt>
                  <dd>{values.orderDate}</dd>
                </div>
              )}
              {values.reference && (
                <div>
                  <dt>Reference</dt>
                  <dd>{values.reference}</dd>
                </div>
              )}
              {values.note && (
                <div>
                  <dt>Note</dt>
                  <dd>{values.note}</dd>
                </div>
              )}
            </dl>
            {status.state === 'error' && (
              <p className={styles.error} role="alert">
                {status.message}
              </p>
            )}
            <div className={styles.actions}>
              <Button size="lg" onClick={confirm} disabled={status.state === 'loading'}>
                {status.state === 'loading' ? 'Sending…' : 'Confirm withdrawal'}
              </Button>
              <Button variant="outline" size="lg" onClick={() => setStep('form')} disabled={status.state === 'loading'}>
                Edit
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && receipt && (
          <div className={styles.review} role="status">
            <p className={styles.lead}>
              <strong>Your withdrawal has been received</strong> on{' '}
              {new Date(receipt.receivedAt).toLocaleString(navigator.language || 'en-GB', { dateStyle: 'long', timeStyle: 'short' })}.
            </p>
            <blockquote className={styles.statement}>I hereby withdraw from my contract for the following: {subjectLabel}.</blockquote>
            <p className={styles.lead}>
              We've emailed a confirmation to {values.email}. We'll refund you within 14 days and cancel any membership so no further payments are taken.
            </p>
            <Button to="/" variant="outline" size="lg">
              Back to Dearly Club
            </Button>
          </div>
        )}
      </Container>
    </Section>
  )
}
