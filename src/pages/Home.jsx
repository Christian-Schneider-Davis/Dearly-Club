import { home } from '../content/site'
import { roles } from '../assets/images'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import Button from '../components/ui/Button'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import usePageTitle from '../hooks/usePageTitle'
import styles from './Home.module.css'

/*
 * Phase 1 preview of the home page: hero + "Why Dearly Club?" using the real
 * copy, photos and design tokens. The full page (animated header, scroll
 * reveals, what's inside, memberships, founder, community, newsletter) is
 * built in Phase 2.
 */
export default function Home() {
  usePageTitle()
  const { hero, why } = home

  return (
    <>
      <section className={styles.hero}>
        <ResponsiveImage
          image={roles.heroWide}
          className={styles.heroImage}
          loading="eager"
          fetchPriority="high"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <Container className={styles.heroContent}>
          <Eyebrow className={styles.heroEyebrow}>{hero.eyebrow}</Eyebrow>
          <h1 className={styles.heroTitle}>
            Create deeper connection, <em>one letter at a time.</em>
          </h1>
          <div className={styles.heroActions}>
            <Button to="/memberships" size="lg">
              {hero.cta}
            </Button>
            <Button to="/gift" size="lg" variant="outline-light">
              {hero.secondaryCta}
            </Button>
          </div>
        </Container>
      </section>

      <Section>
        <Container className={styles.why}>
          <ResponsiveImage
            image={roles.why}
            className={styles.whyImage}
            sizes="(min-width: 900px) 560px, 100vw"
          />
          <div>
            <Eyebrow>{why.eyebrow}</Eyebrow>
            <h2 className={styles.whyTitle}>Meaningful relationships deserve more than a quick message.</h2>
            {why.paragraphs.map((p) => (
              <p key={p} className={styles.whyText}>
                {p}
              </p>
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
