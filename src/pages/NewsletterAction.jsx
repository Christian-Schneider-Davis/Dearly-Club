import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { newsletterPages } from '../content/site'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import { readCallError } from '../lib/callErrors'
import styles from './NewsletterAction.module.css'

/**
 * /newsletter/confirm?token=…     confirms straight away (double opt-in link)
 * /newsletter/unsubscribe?token=… asks for one click first, so email
 *                                 link-scanners can't unsubscribe people
 */
export default function NewsletterAction({ action }) {
  const copy = newsletterPages[action]
  usePageTitle(copy.title)
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState({ type: action === 'confirm' ? 'busy' : 'idle', message: '' })
  const started = useRef(false)

  const run = async () => {
    setState({ type: 'busy', message: '' })
    try {
      const { callFunction } = await import('../lib/firebase')
      await callFunction(action === 'confirm' ? 'confirmNewsletter' : 'unsubscribeNewsletter', { token })
      setState({ type: 'done', message: copy.done })
    } catch (err) {
      setState({ type: 'error', message: readCallError(err).message })
    }
  }

  useEffect(() => {
    if (action === 'confirm' && !started.current) {
      started.current = true
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])

  return (
    <Section className={styles.page}>
      <Container narrow className={styles.inner}>
        <Icon name="letter" size={56} className={styles.icon} />
        <Eyebrow>Newsletter</Eyebrow>
        <h1 className={styles.title}>{action === 'confirm' && state.type !== 'done' ? copy.working.replace('…', '') : copy.title}</h1>
        <div role="status" aria-live="polite">
          {state.type === 'busy' && <p className={styles.muted}>{action === 'confirm' ? copy.working : 'One moment…'}</p>}
          {state.type === 'done' && <p className={styles.lead}>{state.message}</p>}
          {state.type === 'error' && <p className={styles.error}>{state.message}</p>}
        </div>
        {action === 'unsubscribe' && state.type !== 'done' && (
          <>
            {state.type !== 'error' && <p className={styles.lead}>{copy.ask}</p>}
            <Button onClick={run} disabled={state.type === 'busy' || !token}>
              {copy.button}
            </Button>
          </>
        )}
        <div className={styles.back}>
          <Button to="/" variant="outline">
            Back to Dearly Club
          </Button>
        </div>
      </Container>
    </Section>
  )
}
