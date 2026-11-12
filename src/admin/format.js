/* Small display helpers for the admin tables. */

export const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null)

export function fmtDate(v, withTime = false) {
  const d = toDate(v)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function fmtMoney(cents, currency = 'eur') {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
export const countryName = (code) => (code ? (regionNames?.of(code) ?? code) : '')

export const fullName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || '—'

export function addressLines(s) {
  if (!s) return []
  return [s.line1, s.line2, [s.postalCode, s.city].filter(Boolean).join(' '), s.state, countryName(s.country)].filter(Boolean)
}

/** "2026-12" → "December 2026" */
export function monthLabel(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** The Paris calendar month, shifted by `offset` months, as "YYYY-MM". */
export function parisMonth(offset = 0, date = new Date()) {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' })
    .format(date)
    .split('-')
    .map(Number)
  const d = new Date(Date.UTC(y, m - 1 + offset, 15))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const PLAN_LABELS = { member: 'Member', guest: 'One-time', gift: 'Gift' }

/** Build a CSV file (Excel-friendly) and download it. */
export function downloadCsv(filename, rows) {
  const cell = (v) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const stripeLink = (path) => `https://dashboard.stripe.com/${path}`
