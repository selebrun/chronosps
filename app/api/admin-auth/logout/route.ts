import { NextResponse } from 'next/server';
import { ADMIN_API_SESSION_COOKIE, ADMIN_SESSION_COOKIE } from '@/app/api/admin-auth/adminSession';

export async function POST() {
  const response = NextResponse.json({ status: true });
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  } as const;

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...cookieOptions,
    path: '/',
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...cookieOptions,
    path: '/admin',
  });
  response.cookies.set(ADMIN_API_SESSION_COOKIE, '', {
    ...cookieOptions,
    path: '/api',
  });

  return response;
}
