import logo from '../../assets/brand/logo.png'
import logoCream from '../../assets/brand/logo-cream.png'

/**
 * Ariane's round "Dearly Club" seal.
 * tone="burgundy" on light backgrounds, tone="cream" on photos and dark bands.
 * Pass `size` for a fixed size, or leave it out and size it with CSS.
 */
export default function Logo({ tone = 'burgundy', size, className, style }) {
  return (
    <img
      src={tone === 'cream' ? logoCream : logo}
      alt="Dearly Club"
      width={size ?? 64}
      height={size ?? 64}
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
    />
  )
}
