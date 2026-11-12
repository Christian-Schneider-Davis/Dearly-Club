import HomeHero from '../components/home/HomeHero'
import HomeWhy from '../components/home/HomeWhy'
import HomeInside from '../components/home/HomeInside'
import HomePlans from '../components/home/HomePlans'
import HomeFounder from '../components/home/HomeFounder'
import HomeCommunity from '../components/home/HomeCommunity'
import Newsletter from '../components/sections/Newsletter'
import usePageTitle from '../hooks/usePageTitle'

export default function Home() {
  usePageTitle()
  return (
    <>
      <HomeHero />
      <HomeWhy />
      <HomeInside />
      <HomePlans />
      <HomeFounder />
      <HomeCommunity />
      <Newsletter />
    </>
  )
}
