export const HOME_ACCESS_COOKIE_NAME = 'navsphere_home_access'

const HOME_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function isHomeAccessEnabled() {
  return Boolean(process.env.HOME_ACCESS_PASSWORD)
}

export function getHomeAccessMaxAge() {
  return HOME_ACCESS_MAX_AGE_SECONDS
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function createHomeAccessToken() {
  const password = process.env.HOME_ACCESS_PASSWORD
  if (!password) {
    return ''
  }

  const secret = process.env.SESSION_SECRET || 'navsphere'
  return sha256(`${password}:${secret}`)
}

export async function verifyHomeAccessPassword(password: string) {
  return Boolean(process.env.HOME_ACCESS_PASSWORD && password === process.env.HOME_ACCESS_PASSWORD)
}

export async function verifyHomeAccessToken(token?: string) {
  if (!isHomeAccessEnabled()) {
    return true
  }

  if (!token) {
    return false
  }

  return token === await createHomeAccessToken()
}
