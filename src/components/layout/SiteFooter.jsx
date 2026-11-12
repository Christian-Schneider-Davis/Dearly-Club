import { Link } from 'react-router-dom'
import { brand, legalNav, social } from '../../content/site'
import { Container } from '../ui/Layout'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import styles from './SiteFooter.module.css'

const columns = [
  {
    title: 'Club',
    links: [
      { label: 'Memberships', to: '/memberships' },
      { label: 'Gift a Membership', to: '/gift' },
      { label: 'Redeem a Gift', to: '/redeem' },
      { label: 'Manage membership', to: '/manage' },
      { label: 'The Dearly Chat', to: '/dearly-chat' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Log in', to: '/account' },
    ],
  },
  {
    title: 'Legal',
    links: legalNav,
  },
]

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.top}>
        <div className={styles.brand}>
          <Logo tone="cream" size={104} />
          <p className={styles.tagline}>{brand.tagline}</p>
          <div className={styles.social}>
            {social.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" aria-label={`Dearly Club on ${s.label} (${s.handle})`}>
                <Icon name={s.label.toLowerCase()} size={20} />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.columns}>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className={styles.column}>
              <p className={styles.heading}>{col.title}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <Container className={styles.bottom}>
        <p>{brand.copyright}</p>
        {/* Opens the cookie preferences once the banner is built in Phase 6 */}
        <Link to="/legal/cookies">Cookie settings</Link>
      </Container>
    </footer>
  )
}
