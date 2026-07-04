import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { commitFile, getFileContent } from '@/lib/github'
import type { SiteConfig, SiteInfo } from '@/types/site'

export const runtime = 'edge'

const SITE_CONFIG_PATH = 'src/navsphere/content/site.json'

const defaultSiteConfig: SiteConfig = {
  basic: {
    title: '',
    description: '',
    keywords: ''
  },
  appearance: {
    logo: '',
    favicon: '',
    theme: 'system'
  },
  navigation: {
    linkTarget: '_blank'
  }
}

function isValidSiteInfo(data: unknown): data is SiteInfo {
  if (!data || typeof data !== 'object') return false

  const siteInfo = data as SiteInfo
  const theme = siteInfo.appearance?.theme
  const linkTarget = siteInfo.navigation?.linkTarget

  return (
    typeof siteInfo.basic?.title === 'string' &&
    typeof siteInfo.basic?.description === 'string' &&
    typeof siteInfo.basic?.keywords === 'string' &&
    typeof siteInfo.appearance?.logo === 'string' &&
    typeof siteInfo.appearance?.favicon === 'string' &&
    (theme === 'light' || theme === 'dark' || theme === 'system') &&
    (linkTarget === '_blank' || linkTarget === '_self')
  )
}

export async function GET() {
  try {
    const data = await getFileContent(SITE_CONFIG_PATH)
    return NextResponse.json(isValidSiteInfo(data) ? data : defaultSiteConfig)
  } catch (error) {
    console.error('Failed to read site data:', error)
    return NextResponse.json(defaultSiteConfig)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', details: '请先登录后再保存站点配置' },
        { status: 401 }
      )
    }

    const data: unknown = await request.json()
    if (!isValidSiteInfo(data)) {
      return NextResponse.json(
        { error: 'Invalid site data', details: '站点配置数据结构不正确' },
        { status: 400 }
      )
    }

    await commitFile(
      SITE_CONFIG_PATH,
      JSON.stringify(data, null, 2),
      'Update site configuration',
      session.user.accessToken
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save site data:', error)
    return NextResponse.json(
      {
        error: 'Failed to save site data',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}
