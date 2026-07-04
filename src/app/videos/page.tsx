import { VideoContent } from '@/components/video-content'
import { Metadata } from 'next/types'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Container } from '@/components/ui/container'
import { getRuntimeSiteData, getRuntimeVideosData } from '@/lib/content-loader'
import { getProcessedData } from '@/lib/data-loader'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
    const [videosData, siteDataRaw] = await Promise.all([
        getRuntimeVideosData(),
        getRuntimeSiteData(),
    ])

    return getProcessedData(videosData, siteDataRaw)
}

export async function generateMetadata(): Promise<Metadata> {
    const { siteData } = await getData()

    return {
        title: `Videos - ${siteData.basic.title}`,
        description: 'Video Navigation',
        keywords: 'Bilibili, YouTube, Videos',
        icons: {
            icon: siteData.appearance.favicon,
        },
    }
}

export default async function VideosPage() {
    const { navigationData, siteData } = await getData()

    return (
        <Container>
            <VideoContent navigationData={navigationData} siteData={siteData} />
            <ScrollToTop />
        </Container>
    )
}
