import { NextResponse } from 'next/server';
import { runQuery } from '../db';
import { asBoolean, asNonEmptyString, asRecord, safeJsonError } from '../validators';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = asNonEmptyString(searchParams.get('companyId'), 'companyId');
    const rows = await runQuery(
      'SELECT * FROM guest_checklist_submission WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(safeJsonError(error), { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = asNonEmptyString(body.companyId, 'companyId');
    const assetId = asNonEmptyString(body.assetId, 'assetId');
    const templateId = asNonEmptyString(body.templateId, 'templateId');
    const reporterName = asNonEmptyString(body.reporterName, 'reporterName');
    const reporterEmail = asNonEmptyString(body.reporterEmail, 'reporterEmail');
    const answers = asRecord(body.answers, 'answers');

    const rows = await runQuery(
      `INSERT INTO guest_checklist_submission
      (company_id, asset_id, template_id, status, has_failure, answers_json, reporter_name, reporter_email)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        companyId,
        assetId,
        templateId,
        asBoolean(body.requireSupervisorApproval, true) ? 'pending_approval' : 'approved',
        asBoolean(body.hasFailure),
        JSON.stringify(answers),
        reporterName,
        reporterEmail,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(safeJsonError(error), { status: 400 });
  }
}
