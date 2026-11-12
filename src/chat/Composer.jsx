import { useRef, useState } from 'react'
import { chatCopy } from '../content/community'
import styles from './chat.module.css'

const MAX = 2000

/** Message box: Enter sends, Shift+Enter adds a line (on phones, the button sends). */
export default function Composer({ onSend }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  const grow = (el) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }
  const submit = (e) => {
    e?.preventDefault()
    const t = text.trim()
    if (!t || t.length > MAX) return
    onSend(t)
    setText('')
    requestAnimationFrame(() => ref.current && grow(ref.current))
    ref.current?.focus()
  }
  const onKeyDown = (e) => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) submit(e)
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor="chat-message" className="visually-hidden">
        Message
      </label>
      <textarea
        id="chat-message"
        ref={ref}
        rows={1}
        value={text}
        maxLength={MAX + 200}
        placeholder={chatCopy.placeholder}
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
      <button type="submit" className={styles.send} disabled={!text.trim() || text.length > MAX} aria-label="Send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12l16-8-6 16-3-7-7-1z" />
        </svg>
      </button>
    </form>
  )
}
