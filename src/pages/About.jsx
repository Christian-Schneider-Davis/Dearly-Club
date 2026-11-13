import { about } from '../content/site'
import { images } from '../assets/images'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import Newsletter from '../components/sections/Newsletter'
import usePageTitle from '../hooks/usePageTitle'
import styles from './About.module.css'

export default function About() {
  usePageTitle('About')
  return (
    <>
      <Section className={styles.intro}>
        <Container>
          <Reveal className={styles.introHead}>
            <Eyebrow>{about.eyebrow}</Eyebrow>
            <h1 className={styles.title}>{about.greeting}</h1>
          </Reveal>
        </Container>
      </Section>

      <Section className={styles.letterSection}>
        <Container className={styles.layout}>
          <aside className={styles.photos}>
            <Reveal>
              <figure className={styles.polaroid}>
                <ResponsiveImage image={images.arianePortrait} sizes="(min-width: 900px) 360px, 80vw" loading="eager" style={{ objectPosition: 'center 20%' }} />
                <figcaption>Ariane, founder</figcaption>
              </figure>
            </Reveal>
          </aside>

          <article className={styles.letter} aria-label="Founder's letter">
            {about.paragraphs.map((p, i) => (
              <Reveal as="p" key={p} className={styles.para} delay={i === 0 ? 0 : 60}>
                {p}
              </Reveal>
            ))}
            <Reveal className={styles.signoff}>
              <span className={styles.signature}>
                {about.signoff[0]}
                <br />
                {about.signoff[1]}
              </span>
            </Reveal>
          </article>
        </Container>
      </Section>

      <Section tone="ink" className={styles.cta}>
        <Container narrow>
          <Reveal>
            <Eyebrow>Join the club</Eyebrow>
            <h2 className={styles.ctaTitle}>Your first letter is one step away.</h2>
            <div className={styles.ctaActions}>
              <Button to="/memberships" variant="light" size="lg">
                Become a member
              </Button>
              <Button to="/gift" variant="outline-light" size="lg">
                Gift a membership
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Newsletter />
    </>
  )
}
