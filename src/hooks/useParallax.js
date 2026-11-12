import { useEffect, useRef } from 'react'

/**
 * Gentle parallax: the element drifts slower than the page as it scrolls by.
 * Attach the returned ref to an absolutely-positioned layer inside an
 * `overflow: hidden` frame. Skipped entirely when "reduce motion" is on.
 * strength 0.1 ≈ the image travels ±5% of its height.
 */
export default function useParallax(strength = 0.1) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const frame = el.parentElement
    let raf = 0

    const update = () => {
      raf = 0
      const rect = frame.getBoundingClientRect()
      const vh = window.innerHeight
      if (rect.bottom < 0 || rect.top > vh) return
      // -0.5 (frame centre above viewport centre) … 0.5 (below)
      const progress = Math.max(-0.5, Math.min(0.5, (rect.top + rect.height / 2 - vh / 2) / (vh + rect.height)))
      el.style.transform = `translate3d(0, ${(progress * strength * 100).toFixed(2)}%, 0) scale(${1 + strength})`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [strength])

  return ref
}
