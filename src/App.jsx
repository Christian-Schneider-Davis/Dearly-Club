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
import PagePlaceholder from './pages/PagePlaceholder'
import StyleGuide from './pages/StyleGuide'
import NotFound from './pages/NotFound'

// The admin area (and Firebase Auth/Firestore) only downloads when someone opens /admin.
const AdminApp = lazy(() => import('./admin/AdminApp'))

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
        <Route path="dearly-chat" element={<PagePlaceholder title="The Dearly Chat" phase={9} />} />
        <Route path="account" element={<PagePlaceholder title="Your Account" phase={9} />} />
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
