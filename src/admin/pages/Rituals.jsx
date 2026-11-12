import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import Field, { CheckboxField } from '../../components/forms/Field'
import Button from '../../components/ui/Button'
import usePageTitle from '../../hooks/usePageTitle'
import { db } from '../firebase'
import { monthLabel, parisMonth } from '../format'
import useQuery from '../useQuery'
import { Badge, LoadState, PageHead } from '../ui'
import styles from '../admin.module.css'

const blank = () => ({ title: '', month: parisMonth(0), intro: '', body: '', published: false })

/** Write and publish the Slow Rituals members read in The Dearly Chat. */
export default function Rituals() {
  usePageTitle('Slow Rituals')
  const rituals = useQuery(() => collection(db, 'rituals'), [])
  const [editing, setEditing] = useState(null) // null | { id?, ...fields }
  const rows = [...rituals.rows].sort((a, b) => (b.month ?? '').localeCompare(a.month ?? ''))

  return (
    <>
      <PageHead
        title="Slow Rituals"
        intro="Members see published rituals in The Dearly Chat → Slow Rituals, newest month first."
        actions={!editing && <Button onClick={() => setEditing(blank())}>New ritual</Button>}
      />
      {editing ? (
        <Editor
          initial={editing}
          onDone={() => {
            setEditing(null)
            rituals.reload()
          }}
        />
      ) : (
        <LoadState loading={rituals.loading} error={rituals.error} empty={!rows.length && 'No rituals yet. Write the first one!'}>
          <ul className={styles.cards}>
            {rows.map((r) => (
              <li key={r.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <strong>{r.title}</strong> <span className={styles.muted}>· {monthLabel(r.month)}</span>
                  </div>
                  <Badge status={r.published ? 'active' : 'pending'} label={r.published ? 'published' : 'draft'} />
                </div>
                {r.intro && <p className={styles.muted}>{r.intro}</p>}
                <div className={styles.cardActions}>
                  <Button size="md" variant="outline" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </LoadState>
      )}
    </>
  )
}

function Editor({ initial, onDone }) {
  const [v, setV] = useState({ title: initial.title ?? '', month: initial.month ?? parisMonth(0), intro: initial.intro ?? '', body: initial.body ?? '', published: Boolean(initial.published) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (!v.title.trim()) return setError('Give the ritual a title.')
    if (!/^\d{4}-\d{2}$/.test(v.month)) return setError('Choose the month.')
    setBusy(true)
    setError('')
    const data = { title: v.title.trim().slice(0, 120), month: v.month, intro: v.intro.trim().slice(0, 300), body: v.body.trim().slice(0, 20000), published: v.published, updatedAt: serverTimestamp() }
    try {
      if (initial.id) await updateDoc(doc(db, 'rituals', initial.id), data)
      else await addDoc(collection(db, 'rituals'), { ...data, createdAt: serverTimestamp() })
      onDone()
    } catch (err) {
      console.error(err)
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!window.confirm(`Delete “${initial.title}” for good?`)) return
    await deleteDoc(doc(db, 'rituals', initial.id))
    onDone()
  }

  return (
    <form className={styles.panel} onSubmit={save} noValidate>
      <div className={styles.split}>
        <Field label="Title" name="title" required maxLength={120} value={v.title} onChange={set('title')} />
        <Field label="Month" name="month" type="month" required value={v.month} onChange={set('month')} />
      </div>
      <Field label="Short introduction" name="intro" maxLength={300} hint="One or two sentences shown before members open it." value={v.intro} onChange={set('intro')} />
      <Field as="textarea" label="The ritual" name="body" rows={14} hint="Leave a blank line between paragraphs or steps." value={v.body} onChange={set('body')} />
      <CheckboxField name="published" checked={v.published} onChange={set('published')} label="Published — members can see it" />
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.cardActions}>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <button type="button" className={styles.linkButton} onClick={onDone}>
          Cancel
        </button>
        {initial.id && (
          <button type="button" className={styles.linkButton} onClick={remove} style={{ color: 'var(--color-error)' }}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
