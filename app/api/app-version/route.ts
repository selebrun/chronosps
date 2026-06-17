import { NextResponse } from 'next/server';
import { navItems } from '@/config/nav-links';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    build: 'nav-sales-notes-2026-06-17',
    generated_at: new Date().toISOString(),
    nav_items: navItems.flatMap((section) =>
      section.items.map((item) => ({
        name: item.name,
        slug: item.slug,
        role: item.role,
      }))
    ),
  });
}
