import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import Field, { CheckboxField } from '../../components/forms/Field'
import Button from '../../components/ui/Button'
import { readCallError } from '../../lib/callErrors'
import { callFunction } from '../../lib/firebase'
import { db } from '../firebase'
import { fmtDate } from '../format'
import useQuery from '../useQuery'
import { LoadState, PageHead } from '../ui'
import styles from '../admin.module.css'

const AUDIENCES = {
  active: 'Active monthly members',
  gift: 'Gift members (with months left)',
  all: 'Everyone who has ever been a member',
  single: 'One person',
}

/*
 * Write once, send to a group. Each person gets their own private email
 * (nobody sees anyone else's address), with "Dear {first name}," on top.
 */
export default function EmailMembers() {
  usePageTitle('Email members')
  const [params] = useSearchParams()
  const initialTo = params.get('to') ?? ''
  const [values, setValues] = useState({ audience: initialTo ? 'single' : 'active', email: initialTo, subject: '', body: '' })
  const [errors, setErrors] = useState({})
  const [count, setCount] = useState(null) // recipients for the current audience, once checked
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [formError, setFormError] = useState('')

  const campaigns = useQuery(() => query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'), limit(20)), [])

  const set = (name) => (e) => {
    const v = e.target.value
    setValues((s) => ({ ...s, [name]: v }))
    setErrors((er) => ({ ...er, [name]: '' }))
    if (name === 'audience' || name === 'email') {
      setCount(null)
      setConfirm(false)
    }
    setResult('')
  }

  const call = async (dryRun) => {
    setBusy(true)
    setFormError('')
    try {
      const data = await callFunction('adminSendEmail', { ...values, dryRun })
      return data
    } catch (err) {
      const { fields, message } = readCallError(err)
      if (fields) setErrors(fields)
      setFormError(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    const data = await call(true)
    if (data) setCount(data.count)
  }

  const send = async (e) => {
    e.preventDefault()
    const missing = {}
    if (!values.subject.trim()) missing.subject = 'A subject is required.'
    if (values.body.trim().length < 2) missing.body = 'Write a message.'
    if (Object.keys(missing).length) return setErrors(missing)
    if (count == null) return check()
    if (!confirm) return setFormError('Tick the box to confirm.')
    const data = await call(false)
    if (data) {
      setResult(`Sent to ${data.count} ${data.count === 1 ? 'person' : 'people'}.`)
      setValues((v) => ({ ...v, subject: '', body: '' }))
      setCount(null)
      setConfirm(false)
      campaigns.reload()
    }
  }

  return (
    <>
      <PageHead title="Email members" intro="Each person receives their own private email, starting “Dear [first name],”." />
      <div className={styles.split}>
        <form className={styles.panel} onSubmit={send} noValidate>
          <Field as="select" label="Send to" name="audience" value={values.audience} onChange={set('audience')}>
            {Object.entries(AUDIENCES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Field>
          {values.audience === 'single' && (
            <Field label="Their email" name="email" type="email" value={values.email} onChange={set('email')} error={errors.email} required />
          )}
          <Field label="Subject" name="subject" value={values.subject} onChange={set('subject')} error={errors.subject} required maxLength={150} />
          <Field
            as="textarea"
            label="Message"
            name="body"
            rows={10}
            value={values.body}
            onChange={set('body')}
            error={errors.body}
            required
            hint="Leave a blank line between paragraphs. “Dear [first name],” is added for you."
          />

          {count != null && (
            <CheckboxField
              name="confirm"
              checked={confirm}
              onChange={(e) => (setConfirm(e.target.checked), setFormError(''))}
              label={`Yes, send this to ${count} ${count === 1 ? 'person' : 'people'}.`}
            />
          )}
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          {result && (
            <p className={styles.formInfo} role="status">
              {result}
            </p>
          )}
          <div className={styles.cardActions}>
            <Button type="submit" disabled={busy}>
              {busy ? 'Working…' : count == null ? 'Next: check recipients' : 'Send email'}
            </Button>
            {count == null && (
              <button type="button" className={styles.linkButton} onClick={check} disabled={busy}>
                How many people is this?
              </button>
            )}
          </div>
        </form>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Sent</h2>
          <LoadState loading={campaigns.loading} error={campaigns.error} empty={!campaigns.rows.length && 'Nothing sent yet.'}>
            <ul className={styles.sentList}>
              {campaigns.rows.map((c) => (
                <li key={c.id}>
                  <strong>{c.subject}</strong>
                  <span className={styles.sub}>
                    {fmtDate(c.createdAt, true)} · {AUDIENCES[c.audience] ?? c.audience} · {c.count} sent
                  </span>
                </li>
              ))}
            </ul>
          </LoadState>
        </section>
      </div>
    </>
  )
}
