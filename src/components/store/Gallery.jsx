import { useState } from 'react'
import ResponsiveImage from '../ui/ResponsiveImage'
import Icon from '../ui/Icon'
import styles from './Gallery.module.css'

/**
 * Product photo gallery: large photo with a gentle crossfade, thumbnails
 * below, previous/next arrows (also ← → keys when focused).
 */
export default function Gallery({ photos, label = 'Product photos' }) {
  const [index, setIndex] = useState(0)
  const go = (i) => setIndex((i + photos.length) % photos.length)

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(index + 1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(index - 1)
    }
  }

  return (
    <section className={styles.gallery} aria-roledescription="carousel" aria-label={label} onKeyDown={onKeyDown}>
      <div className={styles.stage}>
        {photos.map((photo, i) => (
          <div key={photo.img.src} className={styles.slide} data-active={i === index} aria-hidden={i !== index}>
            <ResponsiveImage
              image={photo}
              sizes="(min-width: 900px) 50vw, 100vw"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : undefined}
            />
          </div>
        ))}
        <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(index - 1)} aria-label="Previous photo">
          <Icon name="arrow" size={20} style={{ transform: 'scaleX(-1)' }} />
        </button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(index + 1)} aria-label="Next photo">
          <Icon name="arrow" size={20} />
        </button>
        <p className={styles.counter} aria-live="polite">
          {index + 1} / {photos.length}
        </p>
      </div>

      <div className={styles.thumbs}>
        {photos.map((photo, i) => (
          <button
            key={photo.img.src}
            type="button"
            className={styles.thumb}
            aria-current={i === index}
            aria-label={`Show photo ${i + 1}: ${photo.alt}`}
            onClick={() => setIndex(i)}
          >
            <ResponsiveImage image={photo} alt="" sizes="120px" />
          </button>
        ))}
      </div>
    </section>
  )
}
