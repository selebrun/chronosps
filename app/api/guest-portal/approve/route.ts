import { NextResponse } from 'next/server';
import { createOdooData } from '@/app/api/odoo/odooService';
import { runQuery } from '../db';

export async function POST(req: Request) {
  const body = await req.json();

  const submission = (await runQuery<any>('SELECT * FROM guest_checklist_submission WHERE id = $1', [body.submissionId]))[0];
  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  let fracttalWorkOrderId: number | null = null;
  if (body.createWorkOrder && submission.has_failure) {
    await new Promise<void>((resolve) => {
      createOdooData(
        'maintenance.request',
        {
          name: `Falla reportada activo ${submission.asset_id}`,
          description: body.failureDescription || 'Incidencia reportada desde portal externo.',
        },
        body.companyId,
        (res: any) => {
          if (res.status) fracttalWorkOrderId = res.data;
          resolve();
        },
        false,
      );
    });
  }

  const rows = await runQuery(
    `UPDATE guest_checklist_submission
      SET status = $1, fracttal_work_order_id = $2, supervisor_comment = $3, approved_at = NOW()
      WHERE id = $4 RETURNING *`,
    [body.approved ? 'approved' : 'rejected', fracttalWorkOrderId, body.supervisorComment || null, body.submissionId]
  );

  return NextResponse.json(rows[0]);
}
