import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Field, { CheckboxField } from '../components/forms/Field'
import Button from '../components/ui/Button'
import { avatarColors, interests as INTERESTS } from '../content/community'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import { countryOptions, guessCountry } from '../lib/countries'
import { callFunction } from '../lib/firebase'
import Avatar from './Avatar'
import styles from './account.module.css'

const MAX_INTERESTS = 6

/** Create (isNew) or edit the public profile. */
export default function ProfileForm({ isNew = false, initial = {}, onSaved, onCancel }) {
  usePageTitle(isNew ? 'Create your profile' : 'Edit profile')
  const countries = useMemo(() => countryOptions(), [])
  const [v, setV] = useState({
    displayName: initial.displayName ?? '',
    country: initial.country ?? (isNew ? guessCountry() : ''),
    bio: initial.bio ?? '',
    interests: initial.interests ?? [],
    avatarColor: initial.avatarColor ?? 'burgundy',
    adult: false,
    guidelines: false,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setV((s) => ({ ...s, [name]: value }))
    setErrors((er) => ({ ...er, [name]: '' }))
  }
  const toggleInterest = (i) =>
    setV((s) => ({
      ...s,
      interests: s.interests.includes(i) ? s.interests.filter((x) => x !== i) : s.interests.length < MAX_INTERESTS ? [...s.interests, i] : s.interests,
    }))

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (v.displayName.trim().length < 2) found.displayName = 'Choose a name of at least 2 characters.'
    if (isNew && !v.adult) found.adult = 'You must be 18 or older to join.'
    if (isNew && !v.guidelines) found.guidelines = 'Please accept the Community Guidelines.'
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await callFunction('saveProfile', v)
      await onSaved()
    } catch (err) {
      const { fields, message } = readCallError(err)
      if (fields) setErrors(fields)
      setFormError(message)
      setBusy(false)
    }
  }

  return (
    <form className={styles.profileForm} onSubmit={submit} noValidate>
      <div className={styles.profileHead}>
        <Avatar name={v.displayName} color={v.avatarColor} size={72} />
        <div>
          <h1 className={styles.title}>{isNew ? 'Create your profile' : 'Edit your profile'}</h1>
          <p className={styles.muted}>Other members see this. Your email and address are never shown.</p>
        </div>
      </div>

      <div className={styles.grid2}>
        <Field
          label="Name shown to others"
          name="displayName"
          required
          maxLength={40}
          autoComplete="nickname"
          hint="Your first name or a pen name."
          value={v.displayName}
          onChange={set('displayName')}
          error={errors.displayName}
        />
        <Field as="select" label="Country" name="country" value={v.country} onChange={set('country')} error={errors.country}>
          <option value="">Prefer not to say</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Field>
      </div>

      <Field
        as="textarea"
        label="A few words about you"
        name="bio"
        rows={4}
        maxLength={300}
        hint={`${300 - v.bio.length} characters left.`}
        value={v.bio}
        onChange={set('bio')}
        error={errors.bio}
      />

      <fieldset className={styles.fieldset}>
        <legend>Interests (up to {MAX_INTERESTS})</legend>
        <div className={styles.chips}>
          {INTERESTS.map((i) => {
            const on = v.interests.includes(i)
            return (
              <button key={i} type="button" aria-pressed={on} className={on ? styles.chipOn : styles.chip} onClick={() => toggleInterest(i)} disabled={!on && v.interests.length >= MAX_INTERESTS}>
                {i}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Avatar colour</legend>
        <div className={styles.swatches}>
          {Object.entries(avatarColors).map(([key, c]) => (
            <label key={key} className={styles.swatch} title={c.label}>
              <input type="radio" name="avatarColor" value={key} checked={v.avatarColor === key} onChange={set('avatarColor')} />
              <span style={{ background: c.bg }} />
              <span className="visually-hidden">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {isNew && (
        <div className={styles.consents}>
          <CheckboxField name="adult" checked={v.adult} onChange={set('adult')} error={errors.adult} label="I’m 18 or older." />
          <CheckboxField
            name="guidelines"
            checked={v.guidelines}
            onChange={set('guidelines')}
            error={errors.guidelines}
            label={
              <>
                I’ve read and accept the{' '}
                <Link to="/legal/community-guidelines" target="_blank">
                  Community Guidelines
                </Link>
                .
              </>
            }
          />
        </div>
      )}

      {formError && (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      )}
      <div className={styles.altRow}>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Saving…' : isNew ? 'Create my profile' : 'Save changes'}
        </Button>
        {onCancel && (
          <button type="button" className={styles.linkButton} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
