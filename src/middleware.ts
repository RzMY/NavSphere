import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { HOME_ACCESS_COOKIE_NAME, isHomeAccessEnabled, verifyHomeAccessToken } from '@/lib/home-access'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth()

    if (!session?.user) {
      const callbackUrl = request.url
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
      )
    }

    return NextResponse.next()
  }

  if (!isHomeAccessEnabled()) {
    return NextResponse.next()
  }

  const token = request.cookies.get(HOME_ACCESS_COOKIE_NAME)?.value
  if (await verifyHomeAccessToken(token)) {
    return NextResponse.next()
  }

  const unlockUrl = new URL('/unlock', request.url)
  unlockUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)

  return NextResponse.redirect(unlockUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/', '/videos/:path*'],
}
