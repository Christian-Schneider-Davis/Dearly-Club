import { Link } from 'react-router-dom'
import styles from './Button.module.css'

/**
 * Pill button. Renders a router <Link> when `to` is set, an <a> when `href`
 * is set, otherwise a <button>.
 * variant: 'primary' | 'dark' | 'outline' | 'light' | 'outline-light'
 * size: 'md' | 'lg'
 */
export default function Button({ to, href, variant = 'primary', size = 'md', block = false, className = '', children, ...rest }) {
  const cls = [styles.button, styles[variant], styles[size], block ? styles.block : '', className].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
