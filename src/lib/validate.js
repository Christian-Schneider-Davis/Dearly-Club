/** Small, dependency-free validators shared by every form. Each returns an error string or ''. */

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const required = (label) => (value) => (String(value ?? '').trim() ? '' : `Please enter your ${label.toLowerCase()}.`)

export const email = (value) => {
  const v = String(value ?? '').trim()
  if (!v) return 'Please enter your email address.'
  return EMAIL.test(v) ? '' : 'Please enter a valid email address (like name@example.com).'
}

export const minLength = (n, label) => (value) =>
  String(value ?? '').trim().length >= n ? '' : `${label} needs at least ${n} characters.`

/**
 * Run a { field: [validator, ...] } schema over values.
 * Returns { field: 'first error' } for fields that fail.
 */
export function validate(schema, values) {
  const errors = {}
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const msg = rule(values[field])
      if (msg) {
        errors[field] = msg
        break
      }
    }
  }
  return errors
}
