import crypto from 'crypto';

export const ADMIN_SESSION_COOKIE = 'chronos-admin-session';

function getAdminSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.CHRONOS_ADMIN_PASSWORD || 'chronos-admin-session';
}

export function createAdminSessionToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, role: 'chronosAdmin' })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAdminSecret())
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function isValidAdminSessionToken(token?: string) {
  if (!token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', getAdminSecret())
    .update(payload)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedSignatureBuffer.length) return false;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data?.email === process.env.CHRONOS_ADMIN_USER && data?.role === 'chronosAdmin';
  } catch {
    return false;
  }
}
