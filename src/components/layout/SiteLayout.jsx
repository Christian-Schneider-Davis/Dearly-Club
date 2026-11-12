import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import CookieBanner from '../consent/CookieBanner'

/** Pages that open with a full-bleed photo the header sits on top of. */
const heroPages = ['/']

/** Jump to the top of the page on every route change (unless linking to an #anchor). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function SiteLayout() {
  const { pathname } = useLocation()
  const overHero = heroPages.includes(pathname)

  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader overHero={overHero} />
      <main id="main" tabIndex={-1} style={overHero ? undefined : { paddingTop: 'var(--header-h)' }}>
        <Outlet />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  )
}
