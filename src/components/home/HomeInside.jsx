import { home } from '../../content/site'
import { roles } from '../../assets/images'
import Reveal from '../motion/Reveal'
import Icon from '../ui/Icon'
import { Container, Eyebrow, Section } from '../ui/Layout'
import ResponsiveImage from '../ui/ResponsiveImage'
import styles from './home.module.css'

const icons = ['postcard', 'letter', 'pen', 'ritual', 'sticker', 'gift']

export default function HomeInside() {
  const { inside } = home
  return (
    <Section tone="paper" aria-labelledby="inside-title" className={styles.insideSection}>
      <Container>
        <Reveal className={styles.centerHead}>
          <Eyebrow>{inside.eyebrow}</Eyebrow>
          <h2 id="inside-title">{inside.heading}</h2>
        </Reveal>

        <ul className={styles.items}>
          {inside.items.map((item, i) => (
            <Reveal as="li" key={item} delay={i * 80} className={styles.item}>
              <Icon name={icons[i]} size={40} className={styles.itemIcon} />
              <span>{item}</span>
            </Reveal>
          ))}
        </ul>
        <Reveal as="p" className={styles.note}>
          {inside.note}
        </Reveal>
      </Container>

      <div className={styles.gallery}>
        {roles.gallery.map((img, i) => (
          <Reveal key={img.img.src} delay={i * 100} className={styles.galleryItem}>
            <ResponsiveImage image={img} sizes="(min-width: 900px) 25vw, 50vw" />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
