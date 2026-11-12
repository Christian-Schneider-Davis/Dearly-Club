/*
 * Shipping schedule (matches functions/src/validate.js → letterMonth).
 * Letters are posted between the 20th and 25th of each month. Join by the
 * 19th (Paris time) to receive next month's letter.
 */
export const CUTOFF_DAY = 19
export const SHIP_DAYS = '20th–25th'

const parisParts = (date) => {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .split('-')
    .map(Number)
  return { y, m, d }
}

/** Info about the first letter for an order placed now. */
export function firstLetter(date = new Date(), locale = 'en-GB') {
  const { y, m, d } = parisParts(date)
  const add = d <= CUTOFF_DAY ? 1 : 2
  const letter = new Date(Date.UTC(y, m - 1 + add, 15))
  const posted = new Date(Date.UTC(y, m - 2 + add, 15))
  const cutoff = new Date(Date.UTC(y, m - 1 + (d <= CUTOFF_DAY ? 0 : 1), CUTOFF_DAY))
  const month = (dt, opts = {}) => dt.toLocaleDateString(locale, { month: 'long', timeZone: 'UTC', ...opts })
  return {
    letterMonth: month(letter), // "December"
    postedMonth: month(posted), // "November"
    cutoffLabel: cutoff.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }), // "19 November"
  }
}
