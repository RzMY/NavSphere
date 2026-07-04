'use client'

export interface BrowserWebsiteMetadata {
  title: string
  description: string
  icon: string
  image?: string
  needsClientFetch?: boolean
}

const MAX_BROWSER_ASSET_SIZE_BYTES = 3 * 1024 * 1024

export async function fetchWebsiteMetadataWithBrowserFallback(url: string): Promise<BrowserWebsiteMetadata> {
  const serverMetadata = await fetchWebsiteMetadataFromApi({ url })

  if (!serverMetadata.needsClientFetch) {
    return serverMetadata
  }

  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      return serverMetadata
    }

    const html = await response.text()
    const { iconUrl, imageUrl } = extractAssetUrls(html, url)
    const [iconDataUrl, imageDataUrl] = await Promise.all([
      fetchAssetAsDataUrl(iconUrl),
      fetchAssetAsDataUrl(imageUrl),
    ])

    return fetchWebsiteMetadataFromApi({
      url,
      html,
      iconDataUrl,
      imageDataUrl,
    })
  } catch (error) {
    console.warn('Browser metadata fetch failed:', error)
    return serverMetadata
  }
}

async function fetchWebsiteMetadataFromApi(body: {
  url: string
  html?: string
  iconDataUrl?: string
  imageDataUrl?: string
}) {
  const response = await fetch('/api/website-metadata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error('获取网站信息失败')
  }

  return response.json() as Promise<BrowserWebsiteMetadata>
}

function extractAssetUrls(html: string, baseUrl: string) {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const iconHref = document.querySelector<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  )?.href
  const imageHref = document.querySelector<HTMLMetaElement>(
    'meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]'
  )?.content

  return {
    iconUrl: resolveUrl(iconHref, baseUrl),
    imageUrl: resolveUrl(imageHref, baseUrl),
  }
}

function resolveUrl(value: string | undefined, baseUrl: string) {
  if (!value) {
    return ''
  }

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
}

async function fetchAssetAsDataUrl(url: string) {
  if (!url) {
    return undefined
  }

  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok) {
      return undefined
    }

    const blob = await response.blob()
    if (!blob.type.startsWith('image/') || blob.size > MAX_BROWSER_ASSET_SIZE_BYTES) {
      return undefined
    }

    return await blobToDataUrl(blob)
  } catch (error) {
    console.warn('Browser asset fetch failed:', error)
    return undefined
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
