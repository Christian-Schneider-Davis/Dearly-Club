import { clubs } from '../../content/site'
import Reveal from '../motion/Reveal'
import Button from '../ui/Button'
import { Container, Eyebrow, Section } from '../ui/Layout'
import styles from './home.module.css'

export default function HomeCommunity() {
  return (
    <Section aria-labelledby="community-title">
      <Container>
        <Reveal className={styles.rowHead}>
          <div>
            <Eyebrow>The Dearly Chat</Eyebrow>
            <h2 id="community-title">A slower kind of community</h2>
          </div>
          <Button to="/dearly-chat" variant="outline">
            Create a free account
          </Button>
        </Reveal>

        <div className={styles.clubs}>
          {clubs.map((club, i) => (
            <Reveal key={club.id} delay={i * 100} className={styles.club}>
              <h3 className={styles.clubName}>{club.name}</h3>
              <p className={styles.clubBlurb}>{club.blurb}</p>
              <p className={club.access === 'free' ? styles.free : styles.members}>
                {club.access === 'free' ? 'Free' : 'Members'}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
