/**
 * The Dearly Member mark: a small burgundy wax seal with a heart.
 * Shown next to paying, gift and lifetime members' names.
 * label: also print "Dearly Member" next to the seal.
 */
export default function MemberBadge({ size = 16, label = false, className = '' }) {
  const seal = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ flex: 'none', display: 'block' }}>
      {/* scalloped wax edge */}
      <path
        fill="#7a1f24"
        d="M12 1.6l2.1 1.5 2.6-.2 1.2 2.3 2.4 1 .1 2.6 1.7 2-1 2.4.6 2.5-2 1.7-.4 2.6-2.5.6-1.5 2.1-2.6-.4L12 22.4l-1.9-1.6-2.6.4L6 19.1l-2.5-.6-.4-2.6-2-1.7.6-2.5-1-2.4 1.7-2 .1-2.6 2.4-1L6.1 1.9l2.6.2z"
      />
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="#c9737a" strokeWidth="0.8" />
      {/* heart */}
      <path fill="#fbf8f3" d="M12 16.2s-3.6-2.2-3.6-4.7c0-1.2.9-2.1 2-2.1.7 0 1.3.4 1.6.9.3-.5.9-.9 1.6-.9 1.1 0 2 .9 2 2.1 0 2.5-3.6 4.7-3.6 4.7z" />
    </svg>
  )
  if (!label) {
    return (
      <span className={className} title="Dearly Member" role="img" aria-label="Dearly Member" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
        {seal}
      </span>
    )
  }
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', verticalAlign: 'middle' }}>
      {seal}
      <span>Dearly Member</span>
    </span>
  )
}
