import logo from '../../assets/brand/logo.png'
import logoCream from '../../assets/brand/logo-cream.png'

/**
 * Ariane's round "Dearly Club" seal.
 * tone="burgundy" on light backgrounds, tone="cream" on photos and dark bands.
 */
export default function Logo({ tone = 'burgundy', size = 64, className, style }) {
  return (
    <img
      src={tone === 'cream' ? logoCream : logo}
      alt="Dearly Club"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, ...style }}
    />
  )
}
