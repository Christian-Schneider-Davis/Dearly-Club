import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import SiteLayout from './components/layout/SiteLayout'
import Home from './pages/Home'
import About from './pages/About'
import Memberships from './pages/Memberships'
import Contact from './pages/Contact'
import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import ManageMembership from './pages/ManageMembership'
import Gift from './pages/Gift'
import GiftSuccess from './pages/GiftSuccess'
import Redeem from './pages/Redeem'
import LegalPage from './pages/LegalPage'
import Withdraw from './pages/Withdraw'
import NewsletterAction from './pages/NewsletterAction'
import DearlyChat from './pages/DearlyChat'
import StyleGuide from './pages/StyleGuide'
import NotFound from './pages/NotFound'

// The admin area (and Firebase Auth/Firestore) only downloads when someone opens /admin.
const AdminApp = lazy(() => import('./admin/AdminApp'))
// Same for the community account area (Firebase Auth + Firestore).
const AccountApp = lazy(() => import('./account/AccountApp'))
const ChatApp = lazy(() => import('./chat/ChatApp'))
const PenPals = lazy(() => import('./chat/PenPals'))
const PenPalChat = lazy(() => import('./chat/PenPalChat'))
const SlowRituals = lazy(() => import('./chat/SlowRituals'))

/*
 * Every page of the approved site map. Placeholders are swapped for the real
 * pages phase by phase (see README → Build plan).
 */
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="memberships" element={<Memberships />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/success" element={<CheckoutSuccess />} />
        <Route path="manage" element={<ManageMembership />} />
        <Route path="gift" element={<Gift />} />
        <Route path="gift/success" element={<GiftSuccess />} />
        <Route path="redeem" element={<Redeem />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="dearly-chat" element={<DearlyChat />} />
        {[
          ['dearly-chat/pen-pals', PenPals],
          ['dearly-chat/pen-pals/:matchId', PenPalChat],
          ['dearly-chat/slow-rituals', SlowRituals],
          ['dearly-chat/:room', ChatApp],
        ].map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <Suspense fallback={null}>
                <Page />
              </Suspense>
            }
          />
        ))}
        <Route
          path="account/*"
          element={
            <Suspense fallback={null}>
              <AccountApp />
            </Suspense>
          }
        />
        <Route path="newsletter/confirm" element={<NewsletterAction action="confirm" />} />
        <Route path="newsletter/unsubscribe" element={<NewsletterAction action="unsubscribe" />} />
        <Route path="legal/withdraw" element={<Withdraw />} />
        <Route path="legal/:doc" element={<LegalPage />} />
        <Route path="styleguide" element={<StyleGuide />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
