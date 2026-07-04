export interface BlobUploadResult {
  url: string
  downloadUrl: string
  pathname: string
  contentType: string
  etag?: string
}

interface UploadAssetOptions {
  folder?: string
  prefix?: string
  extension?: string
  contentType?: string
}

const DEFAULT_BLOB_API_URL = 'https://blob.vercel-storage.com'
const DEFAULT_CACHE_MAX_AGE = 60 * 60 * 24 * 30
const BLOB_API_VERSION = '12'

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN
}

function getBlobApiUrl() {
  return process.env.VERCEL_BLOB_API_URL || DEFAULT_BLOB_API_URL
}

function getBlobStoreId() {
  return process.env.BLOB_STORE_ID
}

function sanitizePathSegment(value: string) {
  return value
    .replace(/^\/+|\/+$/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .filter(Boolean)
    .join('/')
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, '') || 'asset'
}

export function getContentTypeFromExtension(extension: string) {
  switch (extension.toLowerCase().replace(/^\./, '')) {
    case 'svg':
      return 'image/svg+xml'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'ico':
      return 'image/x-icon'
    case 'webp':
      return 'image/webp'
    case 'png':
    default:
      return 'image/png'
  }
}

export async function uploadAssetToBlob(
  binaryData: Uint8Array,
  {
    folder = 'assets',
    prefix = 'img',
    extension = 'png',
    contentType,
  }: UploadAssetOptions = {}
): Promise<BlobUploadResult> {
  const token = getBlobToken()

  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN environment variable')
  }

  const cleanFolder = sanitizePathSegment(folder) || 'assets'
  const cleanPrefix = sanitizeFilePart(prefix)
  const cleanExtension = sanitizeFilePart(extension.replace(/^\./, '').toLowerCase())
  const pathname = `${cleanFolder}/${cleanPrefix}_${Date.now()}.${cleanExtension}`
  const apiUrl = new URL(getBlobApiUrl())
  apiUrl.searchParams.set('pathname', pathname)
  const storeId = getBlobStoreId()

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(storeId ? { 'x-vercel-blob-store-id': storeId } : {}),
      'x-api-version': BLOB_API_VERSION,
      'x-vercel-blob-access': 'public',
      'x-add-random-suffix': '1',
      'x-content-length': binaryData.byteLength.toString(),
      'x-content-type': contentType || getContentTypeFromExtension(cleanExtension),
      'x-cache-control-max-age': DEFAULT_CACHE_MAX_AGE.toString(),
    },
    body: binaryData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to upload asset to Vercel Blob: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
  }

  return response.json()
}
