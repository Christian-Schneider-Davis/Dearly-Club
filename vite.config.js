import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'

// VITE_BASE controls the URL prefix the site is served from.
// - GitHub Pages project URL (christian-schneider-davis.github.io/Dearly-Club/): '/Dearly-Club/'
// - Custom domain (dearlyclub.eu) or local dev: '/'
const base = process.env.VITE_BASE || '/'
// Full public address, used for canonical links, share images and the sitemap.
const siteUrl = (process.env.VITE_SITE_URL || 'https://christian-schneider-davis.github.io/Dearly-Club/').replace(/\/?$/, '/')
process.env.VITE_SITE_URL = siteUrl
const PREVIEW = siteUrl.includes('github.io')

// Pages listed in sitemap.xml (public, indexable pages only).
const PAGES = ['', 'memberships', 'gift', 'about', 'contact', 'redeem', 'legal/terms', 'legal/shipping-returns', 'legal/privacy', 'legal/cookies', 'legal/community-guidelines']

/** Writes sitemap.xml and robots.txt for wherever the site is deployed. */
function seoFiles() {
  return {
    name: 'dearly-seo-files',
    apply: 'build',
    // The github.io copy is a preview: keep it out of Google so it never competes with dearlyclub.eu.
    transformIndexHtml(html) {
      return PREVIEW ? html.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>') : html
    },
    generateBundle() {
      const preview = PREVIEW
      const today = new Date().toISOString().slice(0, 10)
      const urls = PAGES.map((p) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: preview
          ? 'User-agent: *\nDisallow: /\n'
          : `User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /styleguide\nDisallow: /checkout\nDisallow: /newsletter/\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      })
    },
  }
}

export default defineConfig({
  base,
  // The admin chunk carries Firestore (~175 kB gzipped); it only loads on /admin.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [react(), imagetools(), seoFiles()],
})
