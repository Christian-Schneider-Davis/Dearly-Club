import styles from './Layout.module.css'

const join = (...c) => c.filter(Boolean).join(' ')

/** Centered, max-width wrapper with responsive side gutters. */
export function Container({ narrow = false, className, children, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={join(styles.container, narrow && styles.narrow, className)} {...rest}>
      {children}
    </Tag>
  )
}

/** Full-width band with vertical rhythm. tone: cream | paper | blush | ink | oxblood */
export function Section({ tone = 'cream', className, children, ...rest }) {
  return (
    <section className={join(styles.section, styles[`tone-${tone}`], className)} {...rest}>
      {children}
    </section>
  )
}

/** Small uppercase label above headings. */
export function Eyebrow({ children, className, as: Tag = 'p' }) {
  return <Tag className={join(styles.eyebrow, className)}>{children}</Tag>
}
