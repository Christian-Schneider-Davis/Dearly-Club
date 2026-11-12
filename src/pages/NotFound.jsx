import { Link, Navigate, useLocation } from 'react-router-dom'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'
import { legacyRedirect } from '../lib/redirects'

export default function NotFound() {
  const { pathname } = useLocation()
  const to = legacyRedirect(pathname)
  if (to) return <Navigate to={to} replace />
  return <Missing />
}

function Missing() {
  usePageTitle('Page not found', { noindex: true })
  return (
    <Section>
      <Container narrow style={{ textAlign: 'center' }}>
        <Eyebrow>Return to sender</Eyebrow>
        <h1>This letter went astray.</h1>
        <p className="lead" style={{ marginTop: 'var(--space-4)' }}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button to="/" size="lg">
            Back home
          </Button>
        </div>
        <nav aria-label="Popular pages" style={{ marginTop: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-3) var(--space-5)' }}>
          {[
            ['/memberships', 'Memberships'],
            ['/gift', 'Gift a membership'],
            ['/about', 'About'],
            ['/contact', 'Contact'],
          ].map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      </Container>
    </Section>
  )
}
