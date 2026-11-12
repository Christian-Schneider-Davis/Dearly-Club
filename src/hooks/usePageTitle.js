import { useEffect } from 'react'
import { brand } from '../content/site'

/** Sets the browser tab title, e.g. "About | Dearly Club". */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${brand.name}` : brand.seoTitle
  }, [title])
}
