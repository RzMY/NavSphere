import { VideoPlayerPage } from '@/components/video-player-page'
import { Metadata } from 'next/types'
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
        title: `视频播放器 - ${siteData.basic.title}`,
        description: '视频播放中心',
        keywords: 'Bilibili, YouTube, Videos, Player',
        icons: {
            icon: siteData.appearance.favicon,
        },
    }
}

export default async function VideoPlayerRoute() {
    const { navigationData, siteData } = await getData()

    return (
        <VideoPlayerPage navigationData={navigationData} siteData={siteData} />
    )
}
