import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '@/app/api/admin-auth/adminSession';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (email !== process.env.CHRONOS_ADMIN_USER || password !== process.env.CHRONOS_ADMIN_PASSWORD) {
    return NextResponse.json({ status: false, message: 'Usuario o contrasena invalidos.' }, { status: 401 });
  }

  const response = NextResponse.json({ status: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
  });

  return response;
}
