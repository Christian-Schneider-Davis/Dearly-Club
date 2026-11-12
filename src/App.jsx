import { Route, Routes } from 'react-router-dom'
import SiteLayout from './components/layout/SiteLayout'
import Home from './pages/Home'
import About from './pages/About'
import Memberships from './pages/Memberships'
import Contact from './pages/Contact'
import PagePlaceholder from './pages/PagePlaceholder'
import StyleGuide from './pages/StyleGuide'
import NotFound from './pages/NotFound'

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
        <Route path="checkout" element={<PagePlaceholder title="Checkout" phase={4} />} />
        <Route path="gift" element={<PagePlaceholder title="Gift a Membership" phase={5} />} />
        <Route path="redeem" element={<PagePlaceholder title="Redeem a Gift" phase={5} />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="dearly-chat" element={<PagePlaceholder title="The Dearly Chat" phase={9} />} />
        <Route path="account" element={<PagePlaceholder title="Your Account" phase={9} />} />
        <Route path="legal/terms" element={<PagePlaceholder title="Terms & Conditions" phase={6} />} />
        <Route path="legal/shipping-returns" element={<PagePlaceholder title="Shipping, Returns & Cancellation" phase={6} />} />
        <Route path="legal/privacy" element={<PagePlaceholder title="Privacy Policy" phase={6} />} />
        <Route path="legal/cookies" element={<PagePlaceholder title="Cookie Policy" phase={6} />} />
        <Route path="legal/community-guidelines" element={<PagePlaceholder title="Community Guidelines" phase={9} />} />
        <Route path="styleguide" element={<StyleGuide />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/*" element={<PagePlaceholder title="Admin" phase={7} />} />
    </Routes>
  )
}
