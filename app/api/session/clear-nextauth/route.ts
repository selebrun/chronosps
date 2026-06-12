import { NextResponse } from 'next/server';

const NEXTAUTH_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.pkce.code_verifier',
  '__Secure-next-auth.pkce.code_verifier',
  'next-auth.state',
  '__Secure-next-auth.state',
  'next-auth.nonce',
  '__Secure-next-auth.nonce',
];

export async function POST() {
  const response = NextResponse.json({ status: true });

  NEXTAUTH_COOKIE_NAMES.forEach((name) => {
    response.cookies.set(name, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  });

  return response;
}
