import { home } from '../../content/site'
import { roles } from '../../assets/images'
import ParallaxImage from '../motion/ParallaxImage'
import Reveal from '../motion/Reveal'
import { Container, Eyebrow, Section } from '../ui/Layout'
import styles from './home.module.css'

export default function HomeWhy() {
  const { why } = home
  return (
    <Section id="why" aria-labelledby="why-title">
      <Container className={styles.split}>
        <Reveal>
          <ParallaxImage image={roles.why} className={styles.arch} strength={0.1} sizes="(min-width: 900px) 560px, 100vw" />
        </Reveal>
        <div>
          <Reveal>
            <Eyebrow>{why.eyebrow}</Eyebrow>
            <h2 id="why-title" className={styles.sectionTitle}>
              Meaningful relationships deserve more than a quick message.
            </h2>
          </Reveal>
          {why.paragraphs.map((p, i) => (
            <Reveal key={p} as="p" delay={i * 80} className={styles.body}>
              {p}
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
