import { avatarColors } from '../content/community'

/** Round initials avatar in the member's chosen colour. */
export default function Avatar({ name = '', color = 'burgundy', size = 48 }) {
  const c = avatarColors[color] ?? avatarColors.burgundy
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '·'
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.bg,
        color: c.fg,
        display: 'inline-grid',
        placeItems: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.42,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  )
}
