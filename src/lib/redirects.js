/*
 * Old Wix addresses → new pages, so links in old emails, bookmarks, Instagram
 * bios and Google results keep working after the switch.
 * (GitHub Pages can't do server redirects; the app redirects on arrival.)
 */
const RULES = [
  [/^\/pricing-plans(\/.*)?$/, '/memberships'],
  [/^\/plans-pricing\/?$/, '/memberships'],
  [/^\/(category|product-page|shop|store)(\/.*)?$/, '/memberships'],
  [/^\/dearlychat\/?$/, '/dearly-chat'],
  [/^\/group-page(\/.*)?$/, '/dearly-chat'],
  [/^\/groups?\/?$/, '/dearly-chat'],
  [/^\/(account|members-area|profile)(\/.*)?$/, '/account'],
  [/^\/(service-page|event-details)(\/.*)?$/, '/'],
  [/^\/(book-online|event-list|donation-thank-you-page|blank(-\d+)?)\/?$/, '/'],
  [/^\/about-?(us|1)?\/?$/, '/about'],
  [/^\/contact-?(us|1)?\/?$/, '/contact'],
]

/** Returns the new path for an old Wix path, or null. `path` is relative to the site base. */
export function legacyRedirect(path) {
  const p = path.toLowerCase().replace(/\/+$/, '') || '/'
  for (const [re, to] of RULES) if (re.test(p)) return to === p ? null : to
  return null
}
