/** Minimal CSV reader (handles quotes, commas/semicolons, CRLF). Returns rows of strings. */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v.trim()))
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Reads a contacts export (Wix, Mailchimp, a plain list…) into { email, firstName }.
 * If the file has a subscription-status column, only "subscribed" people are kept.
 */
export function readSubscriberFile(text) {
  const rows = parseCsv(text)
  if (!rows.length) return { rows: [], notSubscribed: 0 }
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const hasHeader = !head.some((h) => EMAIL.test(h))
  const col = (test) => head.findIndex(test)
  let emailCol = hasHeader ? col((h) => h === 'email' || h.startsWith('email') || h.includes('e-mail')) : -1
  if (emailCol < 0) emailCol = Math.max(0, (rows[hasHeader ? 1 : 0] ?? []).findIndex((v) => EMAIL.test(v.trim())))
  const nameCol = hasHeader ? col((h) => h === 'first name' || h === 'firstname' || h === 'first_name' || h === 'name') : -1
  const statusCol = hasHeader ? col((h) => h.includes('subscri') && (h.includes('status') || h.includes('subscriber'))) : -1

  let notSubscribed = 0
  const out = []
  for (const r of rows.slice(hasHeader ? 1 : 0)) {
    if (statusCol >= 0) {
      const st = (r[statusCol] ?? '').trim().toLowerCase()
      if (!/^(subscribed|yes|true|opted in)$/.test(st)) {
        notSubscribed++
        continue
      }
    }
    const email = (r[emailCol] ?? '').trim().toLowerCase()
    if (EMAIL.test(email)) out.push({ email, firstName: nameCol >= 0 ? (r[nameCol] ?? '').trim() : '' })
  }
  return { rows: out, notSubscribed }
}
