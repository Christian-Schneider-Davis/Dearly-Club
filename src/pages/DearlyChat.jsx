import { images } from '../assets/images'
import Reveal from '../components/motion/Reveal'
import Button from '../components/ui/Button'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import ResponsiveImage from '../components/ui/ResponsiveImage'
import { chatPage as copy, rooms } from '../content/community'
import { clubs } from '../content/site'
import usePageTitle from '../hooks/usePageTitle'
import styles from './DearlyChat.module.css'

export default function DearlyChat() {
  usePageTitle('The Dearly Chat')
  return (
    <>
      <Section className={styles.hero}>
        <Container className={styles.heroInner}>
          <Reveal className={styles.heroText}>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 className={styles.title}>{copy.heading}</h1>
            <p className={styles.lead}>{copy.intro}</p>
            <div className={styles.actions}>
              <Button to="/account?mode=signup" size="lg">
                Create a free account
              </Button>
              <Button to="/account" variant="outline" size="lg">
                Sign in
              </Button>
            </div>
          </Reveal>
          <Reveal delay={120} className={styles.heroImage}>
            <ResponsiveImage image={images.poppyCardPen2} sizes="(min-width: 900px) 40vw, 100vw" />
          </Reveal>
        </Container>
      </Section>

      <Section tone="blush">
        <Container>
          <Reveal>
            <h2 className={styles.h2}>Three clubs</h2>
          </Reveal>
          <div className={styles.clubs}>
            {clubs.map((c, i) => (
              <Reveal key={c.id} delay={i * 100} className={styles.club}>
                <p className={c.access === 'free' ? styles.free : styles.members}>{c.access === 'free' ? 'Free' : 'Members'}</p>
                <h3 className={styles.clubName}>{c.name}</h3>
                <p>{c.blurb}</p>
                {c.room && rooms[c.room] ? (
                  <Button to={`/dearly-chat/${c.room}`} variant="outline">
                    Open the chat
                  </Button>
                ) : (
                  <p className={styles.soon}>{copy.opening}</p>
                )}
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container narrow>
          <Reveal>
            <h2 className={styles.h2}>How it works</h2>
          </Reveal>
          <ol className={styles.steps}>
            {copy.steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 80}>
                <span className={styles.stepNum}>{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className={styles.safety}>{copy.safety}</p>
          <div className={styles.actions}>
            <Button to="/account?mode=signup">Create a free account</Button>
            <Button to="/memberships" variant="outline">
              Become a member
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
