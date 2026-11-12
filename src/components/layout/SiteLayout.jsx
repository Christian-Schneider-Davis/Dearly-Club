import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { brand, legalNav, mainNav, social } from '../../content/site'
import { Container } from '../ui/Layout'
import styles from './SiteLayout.module.css'

/** Jump to the top of the page on every route change (unless linking to an #anchor). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/*
 * Phase 1 shell. The animated header (transparent → floating pill, envelope
 * menu on phones) and the full footer replace these in Phase 2.
 */
export default function SiteLayout() {
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <Link to="/" className={styles.wordmark}>
            {brand.name}
          </Link>
          <nav aria-label="Main">
            <ul className={styles.nav}>
              {mainNav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => (isActive ? styles.active : undefined)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <Container className={styles.footerInner}>
          <p className={styles.footerBrand}>{brand.name}</p>
          <ul className={styles.footerLinks}>
            {social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
            {legalNav.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <p className={styles.copyright}>{brand.copyright}</p>
        </Container>
      </footer>
    </>
  )
}
