/**
 * Line icons, drawn to match the thin, hand-made feel of the brand.
 * Decorative by default; pass `label` to make one meaningful to screen readers.
 */
const paths = {
  postcard: (
    <>
      <rect x="5" y="9" width="30" height="22" rx="2" />
      <rect x="24" y="13" width="7" height="8" rx="1" />
      <path d="M9 16h10M9 21h10M9 26h7" />
    </>
  ),
  letter: (
    <>
      <rect x="5" y="10" width="30" height="20" rx="2" />
      <path d="M5 12l15 10 15-10" />
    </>
  ),
  pen: (
    <>
      <path d="M26 6l8 8-17 17H9v-8z" />
      <path d="M22 10l8 8M9 31l3-3" />
    </>
  ),
  ritual: (
    <>
      <path d="M15 17h10v16H15z" />
      <path d="M20 17v-3" />
      <path d="M20 5c3 3 3 6 0 8-3-2-3-5 0-8z" />
      <path d="M11 33h18" />
    </>
  ),
  sticker: (
    <>
      <path d="M20 5l4.3 9.2 10 1.2-7.4 6.9 1.9 9.9L20 27.3l-8.8 4.9 1.9-9.9-7.4-6.9 10-1.2z" />
    </>
  ),
  gift: (
    <>
      <rect x="6" y="15" width="28" height="7" rx="1" />
      <path d="M8 22v12h24V22M20 15v19" />
      <path d="M20 15c-2-6-9-7-9-3 0 3 9 3 9 3zM20 15c2-6 9-7 9-3 0 3-9 3-9 3z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" />
    </>
  ),
  tiktok: (
    <>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.6 2.4 4.4 5 4.6" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

const viewBoxes = { instagram: 24, tiktok: 24, menu: 24, close: 24, arrow: 24 }

export default function Icon({ name, size = 24, label, strokeWidth = 1.5, className, style }) {
  const box = viewBoxes[name] ?? 40
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  )
}
