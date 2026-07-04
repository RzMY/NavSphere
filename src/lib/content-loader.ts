import navigationDataRaw from '@/navsphere/content/navigation.json'
import siteDataRaw from '@/navsphere/content/site.json'
import videosDataRaw from '@/navsphere/content/videos.json'
import { getFileContent } from '@/lib/github'
import type { NavigationDataRaw } from '@/types/navigation'
import type { SiteInfo } from '@/types/site'

const NAVIGATION_PATH = 'src/navsphere/content/navigation.json'
const SITE_PATH = 'src/navsphere/content/site.json'
const VIDEOS_PATH = 'src/navsphere/content/videos.json'

function isNavigationDataRaw(data: unknown): data is NavigationDataRaw {
  return (
    !!data &&
    typeof data === 'object' &&
    Array.isArray((data as NavigationDataRaw).navigationItems)
  )
}

function isSiteInfo(data: unknown): data is SiteInfo {
  if (!data || typeof data !== 'object') return false

  const siteInfo = data as SiteInfo

  return (
    typeof siteInfo.basic?.title === 'string' &&
    typeof siteInfo.basic?.description === 'string' &&
    typeof siteInfo.basic?.keywords === 'string' &&
    typeof siteInfo.appearance?.logo === 'string' &&
    typeof siteInfo.appearance?.favicon === 'string' &&
    typeof siteInfo.appearance?.theme === 'string' &&
    typeof siteInfo.navigation?.linkTarget === 'string'
  )
}

async function getJsonFile<T>(
  path: string,
  fallback: T,
  isValid: (data: unknown) => data is T
): Promise<T> {
  const data = await getFileContent(path)
  return isValid(data) ? data : fallback
}

export function getBundledNavigationData(): NavigationDataRaw {
  return navigationDataRaw as NavigationDataRaw
}

export function getBundledSiteData(): SiteInfo {
  return siteDataRaw as SiteInfo
}

export function getBundledVideosData(): NavigationDataRaw {
  return videosDataRaw as NavigationDataRaw
}

export async function getRuntimeNavigationData(): Promise<NavigationDataRaw> {
  return getJsonFile(NAVIGATION_PATH, getBundledNavigationData(), isNavigationDataRaw)
}

export async function getRuntimeSiteData(): Promise<SiteInfo> {
  return getJsonFile(SITE_PATH, getBundledSiteData(), isSiteInfo)
}

export async function getRuntimeVideosData(): Promise<NavigationDataRaw> {
  return getJsonFile(VIDEOS_PATH, getBundledVideosData(), isNavigationDataRaw)
}
