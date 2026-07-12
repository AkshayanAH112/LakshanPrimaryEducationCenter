import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Origins the mobile app (Capacitor webview / Vite dev server) calls the API from.
// Extend via MOBILE_ALLOWED_ORIGINS (comma-separated) without redeploying code changes.
const ALLOWED_ORIGINS = new Set(
  [
    'https://localhost',      // Capacitor Android webview
    'capacitor://localhost',  // Capacitor iOS webview
    'http://localhost',
    'http://localhost:5173',  // Vite dev server
    'http://127.0.0.1:5173',
    ...(process.env.MOBILE_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? []),
  ].filter(Boolean)
);

// Private-LAN origins (phone testing the mobile app against a dev server on this
// network). Public origins still require the explicit allowlist above.
const PRIVATE_LAN_ORIGIN =
  /^https?:\/\/(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)[\d.]+(?::\d+)?$/;

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || PRIVATE_LAN_ORIGIN.test(origin);
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // CORS for the mobile app hitting /api/* from a different origin
  if (pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    if (origin && isAllowedOrigin(origin)) {
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
      }
      const response = NextResponse.next();
      for (const [key, value] of Object.entries(corsHeaders(origin))) {
        response.headers.set(key, value);
      }
      return response;
    }
    return NextResponse.next();
  }

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
  matcher: ['/admin/:path*', '/login', '/api/:path*'],
};
