import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { auth, db } from '../lib/session'
import { setSessionHint } from '../lib/sessionHint'

/**
 * The signed-in person and their Dearly Chat records.
 * { user: undefined (loading) | null | User, profile, account, loaded, reload }
 */
export default function useSession() {
  const [user, setUser] = useState(undefined)
  const [data, setData] = useState({ profile: null, account: null, loaded: false })
  const [, rerender] = useState(0)

  const load = useCallback(async (u) => {
    if (!u?.emailVerified) return setData({ profile: null, account: null, loaded: true })
    try {
      const [p, a] = await Promise.all([getDoc(doc(db, 'profiles', u.uid)), getDoc(doc(db, 'users', u.uid))])
      const profile = p.exists() ? p.data() : null
      setData({ profile, account: a.exists() ? a.data() : null, loaded: true })
      setSessionHint({ name: profile?.displayName || u.email?.split('@')[0], tier: profile?.tier })
    } catch (err) {
      console.error(err)
      setData({ profile: null, account: null, loaded: true, error: true })
    }
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setData((d) => ({ ...d, loaded: false }))
        if (u) load(u)
        else setSessionHint(null)
      }),
    [load],
  )

  const reload = useCallback(async () => {
    await auth.currentUser?.reload()
    await auth.currentUser?.getIdToken(true) // picks up a just-confirmed email
    rerender((n) => n + 1) // same user object, fresh emailVerified
    await load(auth.currentUser)
  }, [load])

  return { user, ...data, loading: user === undefined || (user && !data.loaded), reload }
}
