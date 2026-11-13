import { home } from '../../content/site'
import { roles } from '../../assets/images'
import ParallaxImage from '../motion/ParallaxImage'
import { isMemberHint, useSessionHint } from '../../lib/sessionHint'
import Button from '../ui/Button'
import { Container } from '../ui/Layout'
import styles from './home.module.css'

export default function HomeHero() {
  const member = isMemberHint(useSessionHint())
  const { hero } = home
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <ParallaxImage
        image={roles.heroWide}
        className={`${styles.heroMedia} ${styles.heroWide}`}
        strength={0.12}
        loading="eager"
        fetchPriority="high"
        imgStyle={{ objectPosition: 'center 40%' }}
      />
      <ParallaxImage
        image={roles.heroTall}
        className={`${styles.heroMedia} ${styles.heroTall}`}
        strength={0.12}
        loading="eager"
      />
      <div className={styles.heroShade} aria-hidden="true" />

      <Container className={styles.heroContent}>
        <p className="rise-in" style={{ '--rise-delay': '150ms' }}>
          <span className={styles.heroEyebrow}>{hero.eyebrow}</span>
        </p>
        <h1 id="hero-title" className={`${styles.heroTitle} rise-in`} style={{ '--rise-delay': '300ms' }}>
          Create deeper connection, <em>one letter at a time.</em>
        </h1>
        <div className={`${styles.heroActions} rise-in`} style={{ '--rise-delay': '500ms' }}>
          {member ? (
            <>
              <Button to="/gift" size="lg" variant="light">
                Gift a membership
              </Button>
              <Button to="/manage" size="lg" variant="outline-light">
                Manage my membership
              </Button>
            </>
          ) : (
            <>
              <Button to="/memberships" size="lg" variant="light">
                {hero.cta}
              </Button>
              <Button to="/gift" size="lg" variant="outline-light">
                {hero.secondaryCta}
              </Button>
            </>
          )}
        </div>
      </Container>

      <a href="#why" className={styles.scrollCue} aria-label="Scroll to Why Dearly Club">
        <span />
      </a>
    </section>
  )
}
