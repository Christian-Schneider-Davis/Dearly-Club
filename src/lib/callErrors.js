/**
 * Turns a Cloud Function error into { fields, message } for a form.
 * Only messages meant for the visitor are shown; anything technical becomes
 * a friendly "try again".
 */
const SHOWN = new Set(['invalid-argument', 'not-found', 'already-exists', 'resource-exhausted', 'failed-precondition'])

export function readCallError(err, fallback = 'Something went wrong. Please try again in a moment.') {
  const code = String(err?.code ?? '').replace('functions/', '')
  return {
    fields: err?.details?.fields ?? null,
    message: SHOWN.has(code) && err?.message ? err.message : fallback,
  }
}
