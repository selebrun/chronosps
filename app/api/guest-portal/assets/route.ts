import { NextResponse } from 'next/server';
import { runQuery } from '../db';
import { asNonEmptyString, safeJsonError } from '../validators';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = asNonEmptyString(searchParams.get('companyId'), 'companyId');
    const rows = await runQuery(
      'SELECT * FROM guest_assets_catalog WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(safeJsonError(error), { status: 400 });
  }
}
