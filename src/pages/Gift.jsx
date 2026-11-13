import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice, giftOptions, giftPage as copy } from '../content/site'
import GiftCardPreview from '../components/gift/GiftCardPreview'
import Field, { CheckboxField } from '../components/forms/Field'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { email, required, validate } from '../lib/validate'
import styles from './Gift.module.css'

const STORAGE_KEY = 'dearly-gift'
const empty = { months: 6, buyerName: '', buyerEmail: '', recipientName: '', recipientEmail: '', message: '', sendOn: '', terms: false }

const isoDate = (d) => {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function loadSaved() {
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'), terms: false }
  } catch {
    return { ...empty }
  }
}

export default function Gift() {
  usePageTitle('Gift a Membership')
  const [params] = useSearchParams()
  const cancelled = params.get('cancelled') === '1'
  const [values, setValues] = useState(() => {
    const saved = loadSaved()
    const m = Number(params.get('months'))
    return giftOptions.some((g) => g.months === m) ? { ...saved, months: m } : saved
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const formRef = useRef(null)

  useEffect(() => {
    try {
      const { terms, ...rest } = values
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {
      /* ignore */
    }
  }, [values])

  const option = giftOptions.find((g) => g.months === values.months) ?? giftOptions[1]
  const today = new Date()
  const maxDate = new Date(today)
  maxDate.setFullYear(today.getFullYear() + 1)

  const schema = {
    buyerName: [required('name')],
    buyerEmail: [email],
    recipientName: [required("recipient's name")],
    recipientEmail: [email],
    sendOn: [(v) => (!v || (v >= isoDate(today) && v <= isoDate(maxDate)) ? '' : 'Choose a date between today and one year from now.')],
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
      const { url } = await callFunction('createGiftCheckout', {
        months: values.months,
        buyer: { name: values.buyerName, email: values.buyerEmail },
        recipient: { name: values.recipientName, email: values.recipientEmail },
        message: values.message,
        sendOn: values.sendOn,
        consent: { terms: values.terms },
        returnBase: window.location.origin + import.meta.env.BASE_URL,
      })
      window.location.assign(url)
    } catch (err) {
      const { fields, message } = readCallError(err, "We couldn't reach the payment page. Please try again in a moment.")
      if (fields) {
        setErrors(fields)
        focusFirst(fields)
      }
      setStatus({ state: 'error', message })
    }
  }

  const loading = status.state === 'loading'

  return (
    <Section tone="blush" className={`${styles.page} under-header`}>
      <Container className={styles.layout}>
        <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.form} aria-busy={loading}>
          <Reveal>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 className={styles.title}>{copy.heading}</h1>
            <p className={styles.intro}>{copy.intro}</p>
          </Reveal>

          {cancelled && (
            <p className={styles.notice} role="status">
              {copy.cancelledNote}
            </p>
          )}

          <fieldset className={styles.durations}>
            <legend className={styles.legend}>{copy.durationLabel}</legend>
            <div className={styles.durationGrid}>
              {giftOptions.map((g) => (
                <label key={g.months} className={styles.duration} data-checked={values.months === g.months}>
                  <input
                    type="radio"
                    name="months"
                    value={g.months}
                    checked={values.months === g.months}
                    onChange={() => setValues((s) => ({ ...s, months: g.months }))}
                    className={styles.radio}
                  />
                  <span className={styles.durationMonths}>{g.months} month{g.months === 1 ? '' : 's'}</span>
                  <span className={styles.durationPrice}>{formatPrice(g.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>From</legend>
            <div className={styles.row}>
              <Field label="Your name" name="buyerName" autoComplete="name" required hint="Shown on the gift card." value={values.buyerName} onChange={set('buyerName')} error={errors.buyerName} />
              <Field label="Your email" name="buyerEmail" type="email" inputMode="email" autoComplete="email" required hint="For your receipt." value={values.buyerEmail} onChange={set('buyerEmail')} error={errors.buyerEmail} />
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>To</legend>
            <div className={styles.row}>
              <Field label="Recipient's name" name="recipientName" autoComplete="off" required value={values.recipientName} onChange={set('recipientName')} error={errors.recipientName} />
              <Field label="Recipient's email" name="recipientEmail" type="email" inputMode="email" autoComplete="off" required hint="We'll send the gift card here." value={values.recipientEmail} onChange={set('recipientEmail')} error={errors.recipientEmail} />
            </div>
            <Field
              as="textarea"
              label="Personal message (optional)"
              name="message"
              rows={3}
              maxLength={copy.messageMax}
              hint={`${values.message.length} / ${copy.messageMax} characters`}
              value={values.message}
              onChange={set('message')}
            />
            <Field
              label="Send on (optional)"
              name="sendOn"
              type="date"
              min={isoDate(today)}
              max={isoDate(maxDate)}
              hint="Leave empty to send right after payment, or pick a date like a birthday."
              value={values.sendOn}
              onChange={set('sendOn')}
              error={errors.sendOn}
            />
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
            {loading ? 'Opening secure payment…' : `${copy.submit} · ${formatPrice(option.priceCents)}`}
          </Button>
          <p className={styles.fine}>Paid once, no renewal. Any VAT or sales tax is shown at payment. Payment by Stripe.</p>
        </form>

        <div className={styles.previewCol}>
          <GiftCardPreview months={values.months} recipientName={values.recipientName} buyerName={values.buyerName} message={values.message} />
          <ol className={styles.how}>
            <li>They get the gift card by email, on the date you choose.</li>
            <li>They enter the code and their address. No payment needed.</li>
            <li>{values.months === 1 ? 'Their letter arrives next month.' : `Their letters arrive every month for ${values.months} months.`}</li>
          </ol>
          <p className={styles.redeem}>
            Received a gift? <Link to="/redeem">Redeem it here</Link>
          </p>
        </div>
      </Container>
    </Section>
  )
}
