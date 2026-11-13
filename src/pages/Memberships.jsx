import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice, home, membershipPage as copy, plans } from '../content/site'
import { images } from '../assets/images'
import Reveal from '../components/motion/Reveal'
import Gallery from '../components/store/Gallery'
import PlanSelector from '../components/store/PlanSelector'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import { firstLetter } from '../lib/shipping'
import { isMemberHint, useSessionHint } from '../lib/sessionHint'
import MemberBadge from '../components/ui/MemberBadge'
import styles from './Memberships.module.css'

const photos = [images.watercolourMarketBag]

const icons = ['postcard', 'letter', 'pen', 'ritual', 'sticker', 'gift']

export default function Memberships() {
  usePageTitle('Memberships')
  const isMember = isMemberHint(useSessionHint())
  const [params, setParams] = useSearchParams()
  const planId = plans.some((p) => p.id === params.get('plan')) ? params.get('plan') : 'member'
  const plan = plans.find((p) => p.id === planId)
  const opt = copy.options[planId]

  // Keep ?plan= in the address bar so a chosen option can be shared or bookmarked.
  const choose = (id) => setParams(id === 'member' ? {} : { plan: id }, { replace: true, preventScrollReset: true })

  // Phone: show a slim "buy" bar once the main button scrolls out of view.
  const ctaRef = useRef(null)
  const [showBar, setShowBar] = useState(false)
  useEffect(() => {
    const el = ctaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const checkoutTo = `/checkout?plan=${planId}`
  const first = firstLetter()

  return (
    <>
      <Section className={styles.top}>
        <Container className={styles.product}>
          <Reveal className={styles.galleryCol}>
            <Gallery photos={photos} label="Photos of Dearly Club letters" />
          </Reveal>

          <div className={styles.buy}>
            <Reveal>
              <Eyebrow>{copy.eyebrow}</Eyebrow>
              <h1 className={styles.title}>{plan.name}</h1>
              <p className={styles.price}>
                <span className={styles.amount}>{formatPrice(plan.priceCents)}</span>
                <span className={styles.period}>{plan.mode === 'subscription' ? 'every month' : 'one time'}</span>
              </p>
              <p className={styles.description}>{plan.description}</p>
            </Reveal>

            {isMember ? (
              <Reveal delay={100} className={styles.memberPanel}>
                <p className={styles.memberTitle}>
                  <MemberBadge size={22} /> You’re a Dearly Member
                </p>
                <p>Your letters are on their way every month. Share the joy with someone else, or change your membership any time.</p>
                <div className={styles.memberActions}>
                  <Button to="/gift" size="lg" block>
                    Gift a membership
                  </Button>
                  <Button to="/manage" variant="outline" size="lg" block>
                    Manage or downgrade
                  </Button>
                </div>
              </Reveal>
            ) : (
              <>
            <Reveal delay={100}>
              <PlanSelector legend={copy.frequencyLabel} plans={plans} options={copy.options} value={planId} onChange={choose} />
            </Reveal>

            <Reveal delay={160} className={styles.ctaBlock}>
              <div ref={ctaRef}>
                <Button to={checkoutTo} size="lg" block>
                  {opt.cta}
                </Button>
              </div>
              <p className={styles.fine}>{plan.finePrint}</p>
              <p className={styles.firstLetter}>
                Join by {first.cutoffLabel} for <strong>{first.letterMonth}'s letter</strong>, posted 20–25 {first.postedMonth}.
              </p>
            </Reveal>
              </>
            )}

            <Reveal delay={200}>
              <ul className={styles.perks}>
                {plan.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className={styles.shipping}>{copy.shippingNote}</p>
              <p className={styles.gift}>
                {copy.giftNudge} <Link to="/gift">Gift a membership</Link>
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="paper" aria-labelledby="inside-title">
        <Container>
          <Reveal className={styles.centerHead}>
            <Eyebrow>{home.inside.eyebrow}</Eyebrow>
            <h2 id="inside-title">{home.inside.heading}</h2>
          </Reveal>
          <ul className={styles.items}>
            {home.inside.items.map((item, i) => (
              <Reveal as="li" key={item} delay={i * 70} className={styles.item}>
                <Icon name={icons[i]} size={36} className={styles.itemIcon} />
                <span>{item}</span>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="how-title">
        <Container>
          <Reveal className={styles.centerHead}>
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-title">From our desk to your mailbox</h2>
          </Reveal>
          <ol className={styles.steps}>
            {copy.steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 100} className={styles.step}>
                <span className={styles.stepNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="blush" aria-labelledby="notes-title">
        <Container className={styles.notesWrap}>
          <Reveal>
            <h2 id="notes-title" className={styles.notesTitle}>
              Good to know
            </h2>
          </Reveal>
          <dl className={styles.notes}>
            {copy.notes.map((n, i) => (
              <Reveal key={n.title} delay={i * 80} className={styles.note}>
                <dt>{n.title}</dt>
                <dd>{n.text}</dd>
              </Reveal>
            ))}
          </dl>
        </Container>
      </Section>

      <div className={styles.bar} data-show={showBar} aria-hidden={!showBar} inert={!showBar}>
        <div>
          <p className={styles.barName}>{plan.name}</p>
          <p className={styles.barPrice}>
            {formatPrice(plan.priceCents)}
            {plan.mode === 'subscription' ? ' / month' : ' one time'}
          </p>
        </div>
        <Button to={checkoutTo}>{opt.cta}</Button>
      </div>
    </>
  )
}
