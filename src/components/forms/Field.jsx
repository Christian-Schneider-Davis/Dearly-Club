import { useId } from 'react'
import styles from './Field.module.css'

/**
 * Labelled input with error message, wired for screen readers.
 * as="textarea" | "select" for other controls; extra props go to the control.
 */
export default function Field({ label, error, required = false, hint, as: Control = 'input', className, children, ...props }) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`${styles.field}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <Control
        id={id}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        {...props}
      >
        {children}
      </Control>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Checkbox with its label on the right. */
export function CheckboxField({ label, error, className, ...props }) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={`${styles.check}${className ? ` ${className}` : ''}`}>
      <input id={id} type="checkbox" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...props} />
      <label htmlFor={id}>{label}</label>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
