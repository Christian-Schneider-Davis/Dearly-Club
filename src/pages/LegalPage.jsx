import { Link, useParams } from 'react-router-dom'
import { LEGAL_UPDATED, draft, legalDocs } from '../content/legal'
import { legalNav } from '../content/site'
import { Container, Eyebrow, Section } from '../components/ui/Layout'
import usePageTitle from '../hooks/usePageTitle'
import NotFound from './NotFound'
import styles from './LegalPage.module.css'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** Shared layout for every legal page, with a table of contents. */
export default function LegalPage() {
  const { doc: docId } = useParams()
  const doc = legalDocs[docId]
  usePageTitle(doc?.title ?? 'Not found')
  if (!doc) return <NotFound />

  return (
    <Section className={styles.page}>
      <Container className={styles.layout}>
        <aside className={styles.side}>
          <nav aria-label="Legal pages">
            <p className={styles.sideLabel}>Legal</p>
            <ul>
              {legalNav.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} aria-current={l.to.endsWith(`/${docId}`) ? 'page' : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/legal/withdraw">Withdraw from contract here</Link>
              </li>
            </ul>
          </nav>
        </aside>

        <article className={styles.article}>
          <Eyebrow>Last updated {LEGAL_UPDATED}</Eyebrow>
          <h1 className={styles.title}>{doc.title}</h1>
          {draft && (
            <p className={styles.draft} role="note">
              Draft pending legal review. Some business details are still to be added.
            </p>
          )}
          <p className={styles.intro}>{doc.intro}</p>

          <nav aria-label="On this page" className={styles.toc}>
            <ol>
              {doc.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${slug(s.heading)}`}>{s.heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((s) => (
            <section key={s.heading} id={slug(s.heading)} className={styles.section}>
              <h2 className={styles.heading}>{s.heading}</h2>
              {s.body.map((block, i) =>
                typeof block === 'string' ? (
                  <p key={i}>{block}</p>
                ) : (
                  <ul key={i}>
                    {block.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </Container>
    </Section>
  )
}
