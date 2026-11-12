/*
 * Every country we can ship to (ISO 3166-1 alpha-2), with names in the
 * visitor's language via the browser's built-in translations.
 */
const CODES = `AD AE AF AG AI AL AM AO AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PY QA RE RO RS RW SA SB SC SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW`.split(/\s+/)

// Must match functions/src/validate.js
export const NO_POSTCODE = new Set(`AE AG AO AW BF BI BJ BO BS BW BZ CD CF CG CI CK CM DJ DM ER FJ GA GD GH GM GQ GY HK IE JM KI KM KN KP LY ML MO MR MW NR NU QA RW SB SC SL SR SS ST SY TD TF TG TL TO TV UG VU YE ZW`.split(/\s+/))

export function countryOptions(locale) {
  let names
  try {
    names = new Intl.DisplayNames([locale || navigator.language || 'en', 'en'], { type: 'region' })
  } catch {
    names = { of: (c) => c }
  }
  return CODES.map((code) => ({ code, name: names.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name))
}

/** Best guess at the visitor's country from their browser language, e.g. "fr-FR" → "FR". */
export function guessCountry() {
  const region = (navigator.language || '').split('-')[1]
  return region && CODES.includes(region.toUpperCase()) ? region.toUpperCase() : ''
}
