import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('vocab-auth')
  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const isLoginPage = pathname === '/login'
  const isAuthApi = pathname === '/api/auth'
  const isCronApi = pathname.startsWith('/api/cron/')
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico'

  if (isLoginPage || isAuthApi || isCronApi || isPublicAsset) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!authCookie || authCookie.value !== 'ok') {
    // For API routes, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
