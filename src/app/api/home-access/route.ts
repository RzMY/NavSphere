import { NextResponse } from 'next/server'
import {
  createHomeAccessToken,
  getHomeAccessMaxAge,
  HOME_ACCESS_COOKIE_NAME,
  isHomeAccessEnabled,
  verifyHomeAccessPassword,
} from '@/lib/home-access'

export const runtime = 'edge'

export async function POST(request: Request) {
  if (!isHomeAccessEnabled()) {
    return NextResponse.json({ success: true })
  }

  const { password } = await request.json().catch(() => ({ password: '' }))

  if (typeof password !== 'string' || !await verifyHomeAccessPassword(password)) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(HOME_ACCESS_COOKIE_NAME, await createHomeAccessToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getHomeAccessMaxAge(),
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(HOME_ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
