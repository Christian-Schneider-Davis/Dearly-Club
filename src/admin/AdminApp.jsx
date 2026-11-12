import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { auth, db } from './firebase'
import Login from './Login'
import Dashboard from './pages/Dashboard'
import Shipping from './pages/Shipping'
import Orders from './pages/Orders'
import Members from './pages/Members'
import Gifts from './pages/Gifts'
import Inbox from './pages/Inbox'
import EmailMembers from './pages/EmailMembers'
import styles from './admin.module.css'

/** Admin area: sign-in, admin check, then the dashboard pages. */
export default function AdminApp() {
  // undefined = still checking, null = signed out
  const [user, setUser] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Keep the admin area out of search engines.
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' })
    document.head.append(meta)
    return () => meta.remove()
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setIsAdmin(false)
          setUser(null)
          return
        }
        let ok = false
        try {
          ok = (await getDoc(doc(db, 'admins', u.uid))).exists()
        } catch (err) {
          console.error(err)
        }
        setIsAdmin(ok)
        setUser(u)
      }),
    [],
  )

  if (user === undefined) {
    return <div className={styles.splash}>Loading…</div>
  }
  if (!user) return <Login />
  if (!isAdmin) {
    return (
      <Login
        notice={`${user.email} is signed in but isn't set up as an admin. Ask for admin access, or sign in with another account.`}
        onReset={() => signOut(auth)}
      />
    )
  }

  return (
    <Routes>
      <Route element={<AdminLayout user={user} />}>
        <Route index element={<Dashboard />} />
        <Route path="shipping" element={<Shipping />} />
        <Route path="orders" element={<Orders />} />
        <Route path="members" element={<Members />} />
        <Route path="gifts" element={<Gifts />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="email" element={<EmailMembers />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
