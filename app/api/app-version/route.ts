import { NextResponse } from 'next/server';
import { navItems } from '@/config/nav-links';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getActiveBuildId() {
  try {
    return (await readFile(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    return process.env.NEXT_PUBLIC_APP_VERSION || 'development';
  }
}

export async function GET() {
  const response = NextResponse.json({
    build: await getActiveBuildId(),
    generated_at: new Date().toISOString(),
    nav_items: navItems.flatMap((section) =>
      section.items.map((item) => ({
        name: item.name,
        slug: item.slug,
        role: item.role,
      }))
    ),
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}
