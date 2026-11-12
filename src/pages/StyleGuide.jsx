import { images } from '../assets/images'
import { plans, formatPrice } from '../content/site'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import Button from '../components/ui/Button'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import styles from './StyleGuide.module.css'

const colors = [
  ['Cream', '--color-cream', 'Page background'],
  ['Paper', '--color-paper', 'Cards, raised surfaces'],
  ['Sand', '--color-sand', 'Quiet panels'],
  ['Blush', '--color-blush', 'Soft accent'],
  ['Line', '--color-line', 'Borders'],
  ['Ink', '--color-ink', 'Text, dark bands'],
  ['Ink soft', '--color-ink-soft', 'Secondary text'],
  ['Burgundy', '--color-burgundy', 'Accent — matches the envelopes'],
  ['Burgundy deep', '--color-burgundy-deep', 'Hover'],
  ['Oxblood', '--color-oxblood', 'Envelope illustration band'],
  ['Sage', '--color-sage', 'Free / success'],
]

/** Internal review page: the Phase 1 design system and photo library. */
export default function StyleGuide() {
  usePageTitle('Style guide')
  return (
    <>
      <Section>
        <Container>
          <Eyebrow>Phase 1 · Foundations</Eyebrow>
          <h1>Dearly Club style guide</h1>
          <p className="lead" style={{ marginTop: 'var(--space-4)', maxWidth: '40em' }}>
            The colours, type, buttons and photos every page is built from.
          </p>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className={styles.h}>Colour</h2>
          <div className={styles.swatches}>
            {colors.map(([name, token, use]) => (
              <figure key={token} className={styles.swatch}>
                <div className={styles.chip} style={{ background: `var(${token})` }} />
                <figcaption>
                  <strong>{name}</strong>
                  <span>{use}</span>
                  <code>{token}</code>
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className={styles.h}>Type</h2>
          <div className={styles.type}>
            <p className={styles.label}>Hero · Cormorant Garamond</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-hero)', lineHeight: 1.05 }}>
              Create deeper connection, <em>one letter at a time.</em>
            </p>
            <p className={styles.label}>Heading 2</p>
            <h2>What arrives each month</h2>
            <p className={styles.label}>Heading 3</p>
            <h3>Dearly Member</h3>
            <p className={styles.label}>Price</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-price)' }}>
              {formatPrice(plans[0].priceCents)} <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)' }}>/ month</span>
            </p>
            <p className={styles.label}>Eyebrow · Jost</p>
            <Eyebrow>Inside every envelope</Eyebrow>
            <p className={styles.label}>Lead paragraph · Jost</p>
            <p className="lead" style={{ maxWidth: '36em' }}>
              In a world designed for speed, we make space for slowness. For thoughtful words, intentional rituals, and genuine connection.
            </p>
            <p className={styles.label}>Body · Jost</p>
            <p style={{ maxWidth: '36em' }}>
              Monthly membership, that includes every month: A hand painted postcard, paper letter, writing prompt, a connection ritual, stickers and some surprises! Worldwide Shipping!
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className={styles.h}>Buttons</h2>
          <div className={styles.row}>
            <Button size="lg">Become a member</Button>
            <Button variant="dark" size="lg">Request a pen pal</Button>
            <Button variant="outline" size="lg">Send me one letter</Button>
            <Button variant="outline">Small outline</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className={`${styles.row} ${styles.dark}`}>
            <Button variant="light" size="lg">Join the Mail Club</Button>
            <Button variant="outline-light" size="lg">Gift a membership</Button>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className={styles.h}>Surfaces</h2>
          <div className={styles.tones}>
            {['cream', 'paper', 'blush', 'ink', 'oxblood'].map((t) => (
              <div key={t} className={styles.tone} data-tone={t}>
                {t}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <h2 className={styles.h}>Photo library</h2>
          <p className="muted" style={{ marginBottom: 'var(--space-6)' }}>
            All {Object.keys(images).length} of Ariane's photos, optimised for the web. The name under each is how it's referenced in code.
          </p>
          <div className={styles.gallery}>
            {Object.entries(images).map(([key, img]) => (
              <figure key={key} className={styles.photo}>
                <ResponsiveImage image={img} sizes="(min-width: 900px) 280px, 50vw" />
                <figcaption>
                  <code>{key}</code>
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
