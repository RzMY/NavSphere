import { NextResponse } from 'next/server'
import siteDataRaw from '@/navsphere/content/site.json'
import { processSiteData } from '@/lib/data-loader'
import type { SiteInfo } from '@/types/site'

export const runtime = 'edge'

export async function GET() {
  try {
    return NextResponse.json(processSiteData(siteDataRaw as SiteInfo))
  } catch (error) {
    console.error('Error fetching site config:', error)
    return NextResponse.json(
      { error: '获取站点配置失败' },
      { status: 500 }
    )
  }
}
