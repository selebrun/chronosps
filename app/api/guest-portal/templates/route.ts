import { NextResponse } from 'next/server';
import { runQuery } from '../db';
import { asBoolean, asNonEmptyString, safeJsonError } from '../validators';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = asNonEmptyString(searchParams.get('companyId'), 'companyId');
    const rows = await runQuery('SELECT * FROM guest_checklist_template WHERE company_id = $1 ORDER BY checklist_name', [companyId]);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(safeJsonError(error), { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = asNonEmptyString(body.companyId, 'companyId');
    const assetType = asNonEmptyString(body.assetType, 'assetType');
    const checklistName = asNonEmptyString(body.checklistName, 'checklistName');
    const fields = Array.isArray(body.fields) ? body.fields : [];

    const rows = await runQuery(
      `INSERT INTO guest_checklist_template (company_id, asset_type, checklist_name, require_supervisor_approval, fields_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [companyId, assetType, checklistName, asBoolean(body.requireSupervisorApproval, true), JSON.stringify(fields)]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(safeJsonError(error), { status: 400 });
  }
}
