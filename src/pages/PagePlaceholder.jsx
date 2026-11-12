import { Container, Eyebrow, Section } from '../components/ui/Layout'
import Button from '../components/ui/Button'
import usePageTitle from '../hooks/usePageTitle'

/** Temporary page used until the real page is built in its phase. */
export default function PagePlaceholder({ title, phase, children }) {
  usePageTitle(title)
  return (
    <Section>
      <Container narrow>
        <Eyebrow>Coming in Phase {phase}</Eyebrow>
        <h1>{title}</h1>
        {children && <div style={{ marginTop: 'var(--space-5)' }}>{children}</div>}
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button to="/" variant="outline">
            Back home
          </Button>
        </div>
      </Container>
    </Section>
  )
}
