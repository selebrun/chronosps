import { NextResponse } from 'next/server';
import { runQuery } from '../db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const rows = await runQuery(
    'SELECT * FROM guest_checklist_submission WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const rows = await runQuery(
    `INSERT INTO guest_checklist_submission
    (company_id, asset_id, template_id, status, has_failure, answers_json, reporter_name, reporter_email)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      body.companyId,
      body.assetId,
      body.templateId,
      body.requireSupervisorApproval ? 'pending_approval' : 'approved',
      body.hasFailure,
      JSON.stringify(body.answers),
      body.reporterName,
      body.reporterEmail,
    ]
  );
  return NextResponse.json(rows[0]);
}
