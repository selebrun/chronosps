import { NextResponse } from 'next/server';
import { runQuery } from '../db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const rows = await runQuery(
    'SELECT * FROM guest_assets_catalog WHERE company_id = $1 AND active = true ORDER BY name',
    [companyId]
  );
  return NextResponse.json(rows);
}
