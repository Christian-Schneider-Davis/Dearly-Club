import { useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import { chatCopy } from '../content/community'
import { readCallError } from '../lib/callErrors'
import { callFunction } from '../lib/firebase'
import styles from './chat.module.css'

export default function ReportDialog({ room, message, onClose, onDone }) {
  const [reason, setReason] = useState('unkind')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    d?.showModal?.()
    return () => d?.close?.()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await callFunction('reportMessage', { room, id: message.id, reason, note })
      onDone()
      onClose()
    } catch (err) {
      setError(readCallError(err).message)
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-labelledby="report-title">
      <form onSubmit={submit} className={styles.dialogBody}>
        <h2 id="report-title" className={styles.dialogTitle}>
          Report this message
        </h2>
        <blockquote className={styles.quote}>
          <strong>{message.name}:</strong> {message.text.length > 200 ? `${message.text.slice(0, 200)}…` : message.text}
        </blockquote>
        <fieldset className={styles.reasons}>
          <legend>What’s wrong?</legend>
          {Object.entries(chatCopy.reportReasons).map(([key, label]) => (
            <label key={key}>
              <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} /> {label}
            </label>
          ))}
        </fieldset>
        <label className={styles.noteLabel}>
          Anything else? (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={styles.noteInput} />
        </label>
        <p className={styles.small}>Ariane reviews every report. {message.name} isn’t told who reported them.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.row}>
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send report'}
          </Button>
          <button type="button" className={styles.linkButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  )
}
