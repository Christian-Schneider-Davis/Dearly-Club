import { about } from '../content/site'
import { images } from '../assets/images'
import ParallaxImage from '../components/motion/ParallaxImage'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import Newsletter from '../components/sections/Newsletter'
import usePageTitle from '../hooks/usePageTitle'
import styles from './About.module.css'

// The line that introduces her question gets set apart, as on the original page
const QUESTION_LEAD = 'Dearly Club was born from a simple question:'

export default function About() {
  usePageTitle('About')
  const strip = [images.poppyCameraWide, images.kraftEnvelopePressedFlowers, images.shapeOfTheYearPlant]

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
                <figcaption>Ariane Lignier, founder</figcaption>
              </figure>
            </Reveal>
            <Reveal delay={150}>
              <figure className={`${styles.polaroid} ${styles.polaroidSmall}`}>
                <ResponsiveImage image={images.arianePainting} sizes="(min-width: 900px) 260px, 60vw" style={{ objectPosition: 'center 25%' }} />
              </figure>
            </Reveal>
          </aside>

          <article className={styles.letter} aria-label="Founder's letter">
            {about.paragraphs.map((p, i) => {
              const isLead = p === QUESTION_LEAD
              const isQuestion = about.paragraphs[i - 1] === QUESTION_LEAD
              const isClosing = i === about.paragraphs.length - 1
              const cls = isLead ? styles.lead : isQuestion ? styles.question : isClosing ? styles.closing : styles.para
              return (
                <Reveal as="p" key={p} className={cls} delay={i === 0 ? 0 : 60}>
                  {p}
                </Reveal>
              )
            })}
            <Reveal className={styles.signoff}>
              <span>{about.signoff[0]}</span>
              <span className={styles.signature}>{about.signoff[1]}</span>
            </Reveal>
          </article>
        </Container>
      </Section>

      <section className={styles.strip} aria-label="From recent letters">
        {strip.map((img, i) => (
          <Reveal key={img.img.src} delay={i * 100} className={styles.stripItem}>
            <ParallaxImage image={img} className={styles.stripFrame} strength={0.08} sizes="(min-width: 900px) 33vw, 100vw" />
          </Reveal>
        ))}
      </section>

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
