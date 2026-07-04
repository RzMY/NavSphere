import { NavigationContent } from '@/components/navigation-content'
import { Metadata } from 'next/types'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Container } from '@/components/ui/container'
import { getRuntimeNavigationData, getRuntimeSiteData } from '@/lib/content-loader'
import { getProcessedData } from '@/lib/data-loader'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
  const [navigationData, siteDataRaw] = await Promise.all([
    getRuntimeNavigationData(),
    getRuntimeSiteData(),
  ])

  return getProcessedData(navigationData, siteDataRaw)
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteData } = await getData()

  return {
    title: siteData.basic.title,
    description: siteData.basic.description,
    keywords: siteData.basic.keywords,
    icons: {
      icon: siteData.appearance.favicon,
    },
  }
}

export default async function HomePage() {
  const { navigationData, siteData } = await getData()

  return (
    <Container>
      <NavigationContent navigationData={navigationData} siteData={siteData} />
      <ScrollToTop />
    </Container>
  )
}
