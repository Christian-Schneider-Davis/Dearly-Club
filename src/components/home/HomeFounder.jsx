import { about, brand } from '../../content/site'
import { roles } from '../../assets/images'
import Reveal from '../motion/Reveal'
import Button from '../ui/Button'
import { Container, Eyebrow, Section } from '../ui/Layout'
import ResponsiveImage from '../ui/ResponsiveImage'
import styles from './home.module.css'

export default function HomeFounder() {
  return (
    <Section tone="paper" aria-labelledby="founder-title">
      <Container className={styles.split}>
        <div>
          <Reveal>
            <Eyebrow>A letter from the founder</Eyebrow>
            <blockquote id="founder-title" className={styles.quote}>
              “{about.pullQuote}”
            </blockquote>
            <p className={styles.quoteBy}>— {brand.founder}</p>
          </Reveal>
          <Reveal delay={120}>
            <Button to="/about" variant="outline" size="lg">
              Read Ariane's letter
            </Button>
          </Reveal>
        </div>
        <Reveal delay={150} className={styles.polaroidWrap}>
          <figure className={styles.polaroid}>
            <ResponsiveImage image={roles.founder} sizes="(min-width: 900px) 380px, 80vw" style={{ objectPosition: 'center 20%' }} />
          </figure>
        </Reveal>
      </Container>
    </Section>
  )
}
