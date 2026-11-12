import { Container, Eyebrow, Section } from '../components/ui/Layout'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
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
      </Container>
    </Section>
  )
}
