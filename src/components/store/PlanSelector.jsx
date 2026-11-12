import { formatPrice } from '../../content/site'
import styles from './PlanSelector.module.css'

/**
 * One-time vs monthly choice, built on real radio buttons (arrow keys work)
 * and styled as cards.
 */
export default function PlanSelector({ legend, plans, options, value, onChange, name = 'plan' }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {plans.map((plan) => {
          const opt = options[plan.id]
          const checked = value === plan.id
          return (
            <label key={plan.id} className={styles.option} data-checked={checked}>
              <input
                type="radio"
                name={name}
                value={plan.id}
                checked={checked}
                onChange={() => onChange(plan.id)}
                className={styles.radio}
              />
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.text}>
                <span className={styles.name}>{opt.label}</span>
                <span className={styles.note}>{opt.note}</span>
              </span>
              <span className={styles.price}>
                {formatPrice(plan.priceCents)}
                {plan.mode === 'subscription' && <span className={styles.per}> / month</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
