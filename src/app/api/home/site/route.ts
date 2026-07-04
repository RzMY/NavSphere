import { NextResponse } from 'next/server'
import { getRuntimeSiteData } from '@/lib/content-loader'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const siteData = await getRuntimeSiteData()
    return NextResponse.json(siteData, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error in site API:', error)
    return NextResponse.json(
      { error: '获取站点数据失败' },
      { status: 500 }
    )
  }
}
