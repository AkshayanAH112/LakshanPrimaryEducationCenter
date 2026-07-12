import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS for the mobile app lives in next.config.ts (static headers), not here:
// Vercel answers OPTIONS preflights at the routing layer before the proxy runs.

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname === '/login' && token) {
     return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
