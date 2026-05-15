import { NextResponse } from 'next/server';
import { runQuery } from '../db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const rows = await runQuery('SELECT * FROM guest_checklist_template WHERE company_id = $1 ORDER BY checklist_name', [companyId]);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const rows = await runQuery(
    `INSERT INTO guest_checklist_template (company_id, asset_type, checklist_name, require_supervisor_approval, fields_json)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [body.companyId, body.assetType, body.checklistName, body.requireSupervisorApproval, JSON.stringify(body.fields)]
  );
  return NextResponse.json(rows[0]);
}
