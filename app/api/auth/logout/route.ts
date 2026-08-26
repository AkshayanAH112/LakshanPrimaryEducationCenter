import { NextResponse } from 'next/server';

/**
 * The auth cookie is httpOnly, so the browser cannot clear it itself — the
 * sidebar's logout button needs this route to expire it server-side. Without
 * it, "logging out" leaves the cookie in place and proxy.ts immediately
 * redirects the user back to /admin/dashboard.
 *
 * Every attribute below must match how POST /api/auth/login set the cookie
 * (name, path, secure, sameSite, httpOnly) — a browser only overwrites a
 * cookie when those line up. maxAge: 0 is what actually expires it.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
