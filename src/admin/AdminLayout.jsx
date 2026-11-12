import { signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import { auth } from './firebase'
import styles from './admin.module.css'

const NAV = [
  { to: '', label: 'Dashboard', end: true },
  { to: 'shipping', label: 'Shipping list' },
  { to: 'orders', label: 'Orders' },
  { to: 'members', label: 'Members' },
  { to: 'gifts', label: 'Gift cards' },
  { to: 'inbox', label: 'Inbox' },
  { to: 'email', label: 'Email members' },
]

export default function AdminLayout({ user }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          Menu
        </button>
        <Link to="/admin" className={styles.brand}>
          <Logo size={36} />
          <span>Admin</span>
        </Link>
      </header>
      <aside id="admin-nav" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link to="/admin" className={`${styles.brand} ${styles.sidebarBrand}`}>
          <Logo size={44} />
          <span>Admin</span>
        </Link>
        <nav aria-label="Admin">
          {NAV.map((n) => (
            <NavLink key={n.label} onClick={() => setOpen(false)} to={n.to ? `/admin/${n.to}` : '/admin'} end={n.end} className={({ isActive }) => (isActive ? styles.navActive : styles.navLink)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <p className={styles.signedInAs}>{user.email}</p>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className={styles.footLink}>
            Stripe dashboard ↗
          </a>
          <Link to="/" className={styles.footLink}>
            View website
          </Link>
          <button type="button" className={styles.footLink} onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
