import { auth } from '@/lib/auth'
import { stringToBase64 } from '@/lib/buffer-utils'

export async function getFileContent(path: string) {
  const owner = process.env.GITHUB_OWNER!
  const repo = process.env.GITHUB_REPO!
  const branch = process.env.GITHUB_BRANCH || 'main'
  const timeoutMs = Number(process.env.GITHUB_FETCH_TIMEOUT_MS || 10000)

  try {
    const session = await auth()
    const token = session?.user?.accessToken || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'NavSphere',
    }

    if (token) {
      headers.Authorization = `token ${token}`
    }

    const response = await fetch(apiUrl, {
      headers,
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (response.status === 404) {
      console.warn(`GitHub file not found: ${owner}/${repo}/${path}@${branch}, returning default data`)
      if (path.includes('navigation.json')) {
        return { navigationItems: [] }
      }
      return {}
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} (${owner}/${repo}/${path}@${branch})`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching GitHub file ${owner}/${repo}/${path}@${branch}:`, error)
    if (path.includes('navigation.json')) {
      return { navigationItems: [] }
    }
    return {}
  }
}

export async function commitFile(
  path: string,
  content: string,
  message: string,
  token: string,
  retryCount = 3
) {
  const owner = process.env.GITHUB_OWNER!
  const repo = process.env.GITHUB_REPO!
  const branch = process.env.GITHUB_BRANCH || 'main'

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // 1. 获取当前文件信息（如果存在）
      const currentFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      const currentFileResponse = await fetch(currentFileUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'NavSphere',
        },
        cache: 'no-store', // 禁用缓存，确保获取最新的文件信息
      })

      let sha = undefined
      if (currentFileResponse.ok) {
        const currentFile = await currentFileResponse.json()
        sha = currentFile.sha
      }

      // 2. 创建或更新文件
      const updateUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'NavSphere',
        },
        body: JSON.stringify({
          message,
          content: stringToBase64(content),
          sha,
          branch,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (attempt < retryCount && error.message?.includes('sha')) {
          console.log(`Attempt ${attempt} failed, retrying after delay...`)
          await delay(1000 * attempt) // 指数退避
          continue
        }
        throw new Error(`Failed to commit file: ${error.message}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt === retryCount) {
        console.error('Error in commitFile:', error)
        throw error
      }
      console.log(`Attempt ${attempt} failed, retrying...`)
      await delay(1000 * attempt)
    }
  }
}
