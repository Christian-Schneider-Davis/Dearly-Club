import { useEffect, useRef, useState } from 'react'
import { chatCopy } from '../content/community'
import { preparePhoto } from './photo'
import styles from './chat.module.css'

const MAX = 2000

/** Message box: Enter sends, Shift+Enter adds a line (on phones, the button sends). One photo per message. */
export default function Composer({ onSend }) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null) // { blob, width, height, previewUrl }
  const [preparing, setPreparing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const ref = useRef(null)
  const fileRef = useRef(null)

  // Free the preview if the photo is removed without being sent.
  const sentPhoto = useRef(null)
  useEffect(() => () => photo && photo !== sentPhoto.current && URL.revokeObjectURL(photo.previewUrl), [photo])

  const grow = (el) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }
  const canSend = (text.trim() || photo) && text.length <= MAX && !preparing
  const submit = (e) => {
    e?.preventDefault()
    if (!canSend) return
    sentPhoto.current = photo
    onSend(text.trim(), photo)
    setText('')
    setPhoto(null)
    requestAnimationFrame(() => ref.current && grow(ref.current))
    ref.current?.focus()
  }
  const onKeyDown = (e) => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) submit(e)
  }
  const choose = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    setPreparing(true)
    try {
      setPhoto(await preparePhoto(file))
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPreparing(false)
    }
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      {(photo || preparing || photoError) && (
        <div className={styles.attachRow}>
          {preparing && <p className={styles.status}>Preparing photo…</p>}
          {photoError && (
            <p className={styles.failed} role="alert">
              {photoError}
            </p>
          )}
          {photo && (
            <div className={styles.attachment}>
              <img src={photo.previewUrl} alt="Photo to send" />
              <button type="button" className={styles.attachRemove} onClick={() => setPhoto(null)} aria-label="Remove photo">
                ×
              </button>
            </div>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} onChange={choose} aria-hidden="true" />
      <button type="button" className={styles.photoBtn} onClick={() => fileRef.current?.click()} disabled={preparing} aria-label={photo ? 'Change photo' : 'Add a photo'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="15" rx="2.5" />
          <circle cx="9" cy="10.5" r="1.8" />
          <path d="M21 16l-5-5-8 9" />
        </svg>
      </button>
      <label htmlFor="chat-message" className="visually-hidden">
        Message
      </label>
      <textarea
        id="chat-message"
        ref={ref}
        rows={1}
        value={text}
        maxLength={MAX + 200}
        placeholder={photo ? 'Add a caption (optional)' : chatCopy.placeholder}
        onChange={(e) => {
          setText(e.target.value)
          grow(e.target)
        }}
        onKeyDown={onKeyDown}
        className={styles.input}
      />
      {text.length > MAX - 200 && (
        <span className={text.length > MAX ? styles.over : styles.count} aria-live="polite">
          {MAX - text.length}
        </span>
      )}
      <button type="submit" className={styles.send} disabled={!canSend} aria-label="Send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12l16-8-6 16-3-7-7-1z" />
        </svg>
      </button>
    </form>
  )
}
