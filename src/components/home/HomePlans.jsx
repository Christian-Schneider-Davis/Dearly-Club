import { formatPrice, giftOptions, plans } from '../../content/site'
import Reveal from '../motion/Reveal'
import Button from '../ui/Button'
import { Container, Eyebrow, Section } from '../ui/Layout'
import styles from './home.module.css'

export default function HomePlans() {
  const [member, guest] = plans
  const giftFrom = Math.min(...giftOptions.map((g) => g.priceCents))

  return (
    <Section aria-labelledby="plans-title">
      <Container>
        <Reveal className={styles.centerHead}>
          <Eyebrow>Memberships</Eyebrow>
          <h2 id="plans-title">Choose how you'd like to receive mail</h2>
        </Reveal>

        <div className={styles.plans}>
          <Reveal className={`${styles.plan} ${styles.planFeatured}`}>
            <p className={styles.planTag}>Most loved</p>
            <h3 className={styles.planName}>{member.name}</h3>
            <p className={styles.price}>
              <span>{formatPrice(member.priceCents)}</span> / month
            </p>
            <ul className={styles.perks}>
              {member.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <Button to="/memberships" variant="light" size="lg" block className={styles.planCta}>
              Become a member
            </Button>
            <p className={styles.fine}>{member.finePrint}</p>
          </Reveal>

          <Reveal delay={100} className={styles.plan}>
            <p className={styles.planTag}>Try one month</p>
            <h3 className={styles.planName}>{guest.name}</h3>
            <p className={styles.price}>
              <span>{formatPrice(guest.priceCents)}</span> one time
            </p>
            <ul className={styles.perks}>
              {guest.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <Button to="/memberships?plan=guest" variant="outline" size="lg" block className={styles.planCta}>
              Send me one letter
            </Button>
            <p className={styles.fine}>{guest.finePrint}</p>
          </Reveal>

          <Reveal delay={200} className={`${styles.plan} ${styles.planGift}`}>
            <p className={styles.planTag}>For someone dear</p>
            <h3 className={styles.planName}>Dearly Gift</h3>
            <p className={styles.price}>
              from <span>{formatPrice(giftFrom)}</span>
            </p>
            <ul className={styles.perks}>
              <li>1, 3, 6 or 12 months</li>
              <li>Sent by email with your message</li>
              <li>No address needed — they add their own</li>
            </ul>
            <Button to="/gift" size="lg" block className={styles.planCta}>
              Give a gift
            </Button>
            <p className={styles.fine}>Paid once, no renewal.</p>
          </Reveal>
        </div>

        <Reveal as="p" className={styles.note}>
          Shipping included, worldwide. Any VAT or sales tax for your country is shown at checkout.
        </Reveal>
      </Container>
    </Section>
  )
}
