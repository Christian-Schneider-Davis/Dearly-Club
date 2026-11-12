/**
 * Renders a vite-imagetools "picture" object as <picture> with WebP + JPEG
 * sources. `sizes` tells the browser how wide the image is drawn so it can
 * pick the smallest file that looks sharp.
 */
export default function ResponsiveImage({
  image,
  alt,
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority,
  className,
  style,
}) {
  if (!image) return null
  const { sources = {}, img } = image
  const altText = alt ?? image.alt ?? ''
  const fallbackType = Object.keys(sources).find((t) => t !== 'webp')

  return (
    <picture className={className}>
      {sources.webp && <source type="image/webp" srcSet={sources.webp} sizes={sizes} />}
      {fallbackType && <source type={`image/${fallbackType === 'jpg' ? 'jpeg' : fallbackType}`} srcSet={sources[fallbackType]} sizes={sizes} />}
      <img
        src={img.src}
        width={img.w}
        height={img.h}
        alt={altText}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      />
    </picture>
  )
}
