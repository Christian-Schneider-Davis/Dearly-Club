import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { brand, seo } from '../content/site'

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/?$/, '/')
// The github.io preview copy stays out of search engines.
const PREVIEW = SITE_URL.includes('github.io')

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) return el?.remove()
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.append(el)
  }
  el.setAttribute('content', content)
}

/**
 * Sets the tab title ("About | Dearly Club"), the search/share description and
 * the canonical address for the current page.
 * options.description overrides the default; options.noindex keeps a page out of Google.
 */
export default function usePageTitle(title, { description, noindex = false } = {}) {
  const { pathname } = useLocation()
  useEffect(() => {
    const full = title ? `${title} | ${brand.name}` : brand.seoTitle
    const desc = description ?? seo[pathname.replace(/\/$/, '') || '/'] ?? seo['/']
    document.title = full
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', desc)
    setMeta('name', 'robots', noindex || PREVIEW || pathname.startsWith('/admin') ? 'noindex, nofollow' : null)
    if (SITE_URL !== '/') {
      const url = SITE_URL + pathname.replace(/^\//, '')
      setMeta('property', 'og:url', url)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = Object.assign(document.createElement('link'), { rel: 'canonical' })
        document.head.append(link)
      }
      link.href = url
    }
  }, [title, description, noindex, pathname])
}
