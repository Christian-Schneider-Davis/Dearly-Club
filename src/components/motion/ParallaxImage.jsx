import useParallax from '../../hooks/useParallax'
import ResponsiveImage from '../ui/ResponsiveImage'

/**
 * A photo that drifts gently as the page scrolls. The outer element is the
 * frame (give it a size, shape and border-radius via className); the photo
 * moves inside it.
 */
export default function ParallaxImage({ image, strength = 0.1, className, imgStyle, sizes, loading, fetchPriority, alt }) {
  const layer = useParallax(strength)
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={layer} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        <ResponsiveImage
          image={image}
          alt={alt}
          sizes={sizes}
          loading={loading}
          fetchPriority={fetchPriority}
          style={imgStyle}
        />
      </div>
    </div>
  )
}
