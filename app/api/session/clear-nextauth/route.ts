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

function getCookieNames() {
  return NEXTAUTH_COOKIE_NAMES.flatMap((name) => [
    name,
    `${name}.0`,
    `${name}.1`,
    `${name}.2`,
    `${name}.3`,
  ]);
}

function getCookieDomains(request: Request) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  if (host.endsWith('.chronosps.app')) return [undefined, '.chronosps.app'];
  return [undefined];
}

export async function POST(request: Request) {
  const response = NextResponse.json({ status: true });
  const isProduction = process.env.NODE_ENV === 'production';

  getCookieDomains(request).forEach((domain) => {
    getCookieNames().forEach((name) => {
      // Attempt deletion as httpOnly (session-token, csrf-token, etc.)
      response.cookies.set(name, '', {
        domain,
        httpOnly: true,
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        secure: isProduction,
      });
      // Also attempt deletion as non-httpOnly (callback-url).
      // Firefox refuses to delete a non-httpOnly cookie via a Set-Cookie
      // that has the HttpOnly flag set, so we must send both variants.
      response.cookies.set(name, '', {
        domain,
        httpOnly: false,
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        secure: isProduction,
      });
    });
  });

  return response;
}
