import { NextResponse } from 'next/server'
import { getRuntimeNavigationData } from '@/lib/content-loader'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const navigationData = await getRuntimeNavigationData()
    return NextResponse.json(navigationData, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error in navigation API:', error)
    return NextResponse.json(
      { error: '获取导航数据失败' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
