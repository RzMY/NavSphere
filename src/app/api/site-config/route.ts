import { NextResponse } from 'next/server'
import { getRuntimeSiteData } from '@/lib/content-loader'
import { processSiteData } from '@/lib/data-loader'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const siteDataRaw = await getRuntimeSiteData()
    return NextResponse.json(processSiteData(siteDataRaw), {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error fetching site config:', error)
    return NextResponse.json(
      { error: '获取站点配置失败' },
      { status: 500 }
    )
  }
}
