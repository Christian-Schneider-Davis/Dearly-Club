import { images } from '../../assets/images'
import ResponsiveImage from '../ui/ResponsiveImage'
import styles from './GiftCardPreview.module.css'

/** Live preview of the e-gift card, updating as the buyer types. */
export default function GiftCardPreview({ months, recipientName, buyerName, message }) {
  const to = recipientName?.trim() || 'someone dear'
  return (
    <figure className={styles.wrap} aria-label="Preview of the e-gift card">
      <div className={styles.card}>
        <div className={styles.art}>
          <ResponsiveImage image={images.envelopeIllustration} sizes="240px" alt="" style={{ objectPosition: 'center 60%' }} />
        </div>
        <div className={styles.body}>
          <p className={styles.for}>A gift for {to}</p>
          <p className={styles.title}>
            {months} months of <em>Dearly Club</em>
          </p>
          {message?.trim() && <p className={styles.message}>“{message.trim()}”</p>}
          {buyerName?.trim() && <p className={styles.from}>— {buyerName.trim()}</p>}
          <p className={styles.code}>CODE · DEAR-XXXX-XXXX</p>
        </div>
      </div>
      <figcaption className={styles.caption}>What they'll receive by email</figcaption>
    </figure>
  )
}
