import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { brand, mainNav } from '../../content/site'
import useScrolled from '../../hooks/useScrolled'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import MobileMenu from './MobileMenu'
import styles from './SiteHeader.module.css'

/**
 * Three looks:
 *  - "hero": clear, cream text, sitting over a full-bleed photo (home page top)
 *  - "top":  clear, ink text, at the top of every other page
 *  - "pill": after scrolling, shrinks into a floating frosted pill
 * On phones the links move into the envelope menu.
 */
export default function SiteHeader({ overHero = false }) {
  const scrolled = useScrolled(48)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useEffect(() => setMenuOpen(false), [pathname])

  const mode = scrolled ? 'pill' : overHero ? 'hero' : 'top'
  const onDark = mode === 'hero'

  return (
    <>
      <header className={`${styles.header} ${styles[mode]}`}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logo} aria-label={`${brand.name} home`}>
            <Logo tone={onDark ? 'cream' : 'burgundy'} />
          </Link>

          <nav aria-label="Main" className={styles.nav}>
            <ul>
              {mainNav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => `${styles.link}${isActive ? ` ${styles.active}` : ''}`}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <NavLink to="/account" className={`${styles.link} ${styles.login}`}>
              Log in
            </NavLink>
            <Button to="/memberships" variant={onDark ? 'light' : 'primary'} className={styles.join}>
              <span className={styles.joinLong}>Join the Mail Club</span>
              <span className={styles.joinShort}>Join</span>
            </Button>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu id="mobile-menu" open={menuOpen} onClose={closeMenu} />
    </>
  )
}
