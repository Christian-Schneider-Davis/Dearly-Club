import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Container, Section } from '../components/ui/Layout'
import { auth, db } from '../lib/session'
import AccountHome from './AccountHome'
import AuthPanel from './AuthPanel'
import FinishLink from './FinishLink'
import ProfileForm from './ProfileForm'
import VerifyEmail from './VerifyEmail'
import styles from './account.module.css'

/**
 * /account — sign in or create an account, confirm the email, make a profile,
 * then the account home. /account/finish completes an emailed sign-in link.
 */
export default function AccountApp() {
  return (
    <Section className={styles.page}>
      <Container className={styles.container}>
        <Routes>
          <Route path="finish" element={<FinishLink />} />
          <Route path="*" element={<Gate />} />
        </Routes>
      </Container>
    </Section>
  )
}

function Gate() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [data, setData] = useState({ profile: null, private: null, loaded: false })
  const [, rerender] = useState(0)

  const load = useCallback(async (u) => {
    if (!u?.emailVerified) return setData({ profile: null, private: null, loaded: true })
    try {
      const [p, priv] = await Promise.all([getDoc(doc(db, 'profiles', u.uid)), getDoc(doc(db, 'users', u.uid))])
      setData({ profile: p.exists() ? p.data() : null, private: priv.exists() ? priv.data() : null, loaded: true })
    } catch (err) {
      console.error(err)
      setData({ profile: null, private: null, loaded: true, error: true })
    }
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setData((d) => ({ ...d, loaded: false }))
        if (u) load(u)
      }),
    [load],
  )

  const reload = useCallback(async () => {
    await auth.currentUser?.reload()
    await auth.currentUser?.getIdToken(true) // picks up a just-confirmed email
    rerender((n) => n + 1) // same user object, fresh emailVerified
    await load(auth.currentUser)
  }, [load])

  if (user === undefined || (user && !data.loaded)) return <p className={styles.muted}>Loading…</p>
  if (!user) return <AuthPanel />
  if (!user.emailVerified) return <VerifyEmail user={user} onConfirmed={reload} />
  if (data.private?.suspended) {
    return (
      <div className={styles.narrow}>
        <h1 className={styles.title}>Your account is paused</h1>
        <p>Please contact us if you think this is a mistake.</p>
      </div>
    )
  }
  if (!data.profile) return <ProfileForm isNew email={user.email} onSaved={reload} />
  return <AccountHome user={user} profile={data.profile} account={data.private} onChanged={reload} />
}
