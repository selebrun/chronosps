import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/app/api/admin-auth/adminSession';

export async function POST() {
  const response = NextResponse.json({ status: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 0,
  });

  return response;
}
