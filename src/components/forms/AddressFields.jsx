import { useMemo } from 'react'
import { NO_POSTCODE, countryOptions } from '../../lib/countries'
import Field from './Field'
import styles from './AddressFields.module.css'

/** Address schema rules for lib/validate (postcode depends on the country). */
export function addressSchema(values, required) {
  return {
    line1: [required('street address')],
    city: [required('city')],
    postalCode: NO_POSTCODE.has(values.country) ? [] : [required('postcode')],
    country: [(v) => (v ? '' : 'Please choose your country.')],
  }
}

/**
 * Country, street, apartment, city, postcode and region, with the browser's
 * address autofill wired up. Postcode turns optional for countries without them.
 */
export default function AddressFields({ values, errors, onChange }) {
  const countries = useMemo(() => countryOptions(), [])
  const postcodeOptional = NO_POSTCODE.has(values.country)

  return (
    <>
      <Field as="select" label="Country" name="country" autoComplete="country" required value={values.country} onChange={onChange('country')} error={errors.country}>
        <option value="">Choose your country…</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </Field>
      <Field label="Street address" name="line1" autoComplete="address-line1" required placeholder="Street and number" value={values.line1} onChange={onChange('line1')} error={errors.line1} />
      <Field label="Apartment, suite, etc. (optional)" name="line2" autoComplete="address-line2" value={values.line2} onChange={onChange('line2')} />
      <div className={styles.row3}>
        <Field label="City" name="city" autoComplete="address-level2" required value={values.city} onChange={onChange('city')} error={errors.city} />
        <Field
          label={postcodeOptional ? 'Postcode (optional)' : 'Postcode / ZIP'}
          name="postalCode"
          autoComplete="postal-code"
          required={!postcodeOptional}
          value={values.postalCode}
          onChange={onChange('postalCode')}
          error={errors.postalCode}
        />
        <Field label="State / region (optional)" name="state" autoComplete="address-level1" value={values.state} onChange={onChange('state')} />
      </div>
    </>
  )
}
