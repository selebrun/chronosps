'use server'
import { getOdooData, setOdooData } from '@/app/api/odoo/odooService';
import { pauseWorkOrderForQuality, publishWorkOrderQualityState } from '@/app/api/updateOrder/updateOrder';
import { getWorkOrderTimerSnapshots } from '@/app/api/workOrderTimers/workOrderTimers';

function writeOdooData(model: string, ids: any[], values: any, companyId: string): Promise<any> {
  return new Promise((resolve) => {
    setOdooData(model, ids, values, companyId, (data: any) => resolve(data));
  });
}

function getOdooRecords(model: string, domain: any[], fields: string[], companyId: string): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(model, domain, fields, false, false, companyId, (data: any) => {
      resolve(data);
    }, false);
  });
}

function getMany2OneId(value: any) {
  return Number(Array.isArray(value) ? value[0] : value) || 0;
}

function canManageQuality(user: any) {
  return ['Calidad', 'Lider', 'Jefe'].includes(String(user?.role || '').trim());
}

async function getQualityCheckSummary(workOrderId: number, companyId: string) {
  const response = await getOdooRecords(
    'quality.check',
    [['workorder_id', '=', workOrderId]],
    ['id', 'quality_state', 'test_type'],
    companyId
  );
  const checks = response?.status && Array.isArray(response?.data) ? response.data : [];
  const validationChecks = checks.filter((check: any) => (
    String(check?.test_type || '').trim().toLowerCase() !== 'instructions'
  ));
  const failedChecks = validationChecks
    .filter((check: any) => check?.quality_state === 'fail')
    .sort((left: any, right: any) => Number(left?.id) - Number(right?.id));
  const pendingChecks = validationChecks
    .filter((check: any) => !['pass', 'fail'].includes(check?.quality_state))
    .sort((left: any, right: any) => Number(left?.id) - Number(right?.id));
  return {
    status: Boolean(response?.status),
    failed: failedChecks.length > 0,
    pending: pendingChecks.length > 0,
    firstFailedId: Number(failedChecks[0]?.id) || null,
    firstPendingId: Number(pendingChecks[0]?.id) || null,
  };
}

async function updateQualityControl(
  user: any,
  quality_control: any,
  qualityState: 'pass' | 'fail',
  observations?: string,
  measure?: number
) {
  if (!canManageQuality(user)) {
    return { status: false, message: 'Su perfil no puede gestionar controles de calidad.' };
  }
  if (!quality_control?.id) {
    return { status: false, message: "No se encontro el control de calidad seleccionado." };
  }

  const qualityControlId = quality_control.id;
  const workOrderId = getMany2OneId(quality_control?.workorder_id);
  const wasFailed = quality_control?.quality_state === 'fail';
  const snapshots = workOrderId ? await getWorkOrderTimerSnapshots(user, [workOrderId]) : new Map<number, any>();
  const timerSnapshot = snapshots.get(workOrderId);
  const previousSharedState = String(timerSnapshot?.workorder_state || '').trim();
  const wasWaitingForFinalQuality = ['quality_pending', 'quality_failed_pending'].includes(previousSharedState);
  let activeQualityCheckId = Number(timerSnapshot?.active_quality_check_id) || null;

  if (wasWaitingForFinalQuality && !activeQualityCheckId) {
    const currentSummary = await getQualityCheckSummary(workOrderId, user.company_id);
    activeQualityCheckId = currentSummary.firstPendingId;
  }
  if (wasWaitingForFinalQuality && activeQualityCheckId && Number(qualityControlId) !== activeQualityCheckId) {
    return {
      status: false,
      message: 'Este control aun no fue convocado para la orden de trabajo. Complete primero el control activo.',
    };
  }

  const values: any = { quality_state: qualityState };
  if (observations !== undefined) values.additional_note = observations;
  if (measure !== undefined) values.measure = measure;

  if (qualityState === 'fail') {
    if (!workOrderId) {
      return { status: false, message: 'El control de calidad no tiene una orden de trabajo asociada.' };
    }
    const pauseResult = await pauseWorkOrderForQuality(user, workOrderId);
    if (!pauseResult?.status) {
      return {
        status: false,
        message: pauseResult?.message || 'No se pudo pausar la orden de trabajo antes de registrar la falla.',
      };
    }
  }

  console.log('Control de calidad: actualizando', {
    id: qualityControlId,
    quality_state: qualityState,
    additional_note_length: observations?.length || 0,
    measure
  });

  const stateResult = await writeOdooData(
    'quality.check',
    [qualityControlId],
    values,
    user.company_id
  );

  if (!stateResult || !stateResult.status) {
    return { status: false, message: stateResult?.message || "Ocurrio un error al actualizar el estado del control de calidad en Odoo." };
  }

  if (qualityState === 'fail') {
    const publishResult = await publishWorkOrderQualityState(
      user,
      workOrderId,
      wasWaitingForFinalQuality ? 'failed_pending' : 'failed',
      Number(qualityControlId)
    );
    if (!publishResult?.status) {
      return { status: false, message: publishResult?.message || 'La falla se registro en Odoo, pero no se pudo bloquear la OT en Piso.' };
    }
  } else if (workOrderId) {
    const qualitySummary = await getQualityCheckSummary(workOrderId, user.company_id);
    if (!qualitySummary.status) {
      return { status: false, message: 'El control se aprobo, pero no se pudo verificar si existen otras fallas en la OT.' };
    }
    const wasWaitingForQuality = wasFailed
      || ['quality_pending', 'quality_failed', 'quality_failed_pending'].includes(previousSharedState);
    if (wasWaitingForQuality || qualitySummary.failed) {
      const pauseResult = await pauseWorkOrderForQuality(user, workOrderId);
      if (!pauseResult?.status) {
        return { status: false, message: pauseResult?.message || 'El control se aprobo, pero no se pudo mantener pausada la OT.' };
      }
      const qualityStatus: 'failed' | 'failed_pending' | 'clear' = qualitySummary.failed
        ? wasWaitingForFinalQuality ? 'failed_pending' : 'failed'
        : 'clear';
      const publishResult = await publishWorkOrderQualityState(
        user,
        workOrderId,
        qualityStatus,
        qualitySummary.failed ? qualitySummary.firstFailedId : null
      );
      if (!publishResult?.status) {
        return { status: false, message: publishResult?.message || 'El control se aprobo, pero no se pudo actualizar el estado compartido de la OT.' };
      }
    }
  }

  return { status: true };
}

export async function acceptQualityControl (user: any, quality_control: any, observations?: string, measure?: number ): Promise<any>{
  return new Promise(async (resolve) => {
    const data = await updateQualityControl(user, quality_control, 'pass', observations, measure);
    if(!data || !data.status) return resolve({status: false, message: data?.message || "Ocurrio un error al aprobar el control de calidad en Odoo."})
    return resolve({status: true, message: "Control de calidad aprobado."})
  })
}

export async function rejectQualityControl (user: any, quality_control: any, observations?: string, measure?: number ): Promise<any>{
  return new Promise(async (resolve) => {
    const data = await updateQualityControl(user, quality_control, 'fail', observations, measure);
    if(!data || !data.status) return resolve({status: false, message: data?.message || "Ocurrio un error al rechazar el control de calidad en Odoo."})
    return resolve({status: true, message: "Control de calidad rechazado."})
  })
}

export async function saveQualityControlNotes(user: any, quality_control: any, observations?: string, measure?: number): Promise<any> {
  return new Promise(async (resolve) => {
    if (!canManageQuality(user)) {
      return resolve({ status: false, message: 'Su perfil no puede gestionar controles de calidad.' });
    }
    if (!quality_control?.id) {
      return resolve({ status: false, message: "No se encontro el control de calidad seleccionado." });
    }

    const values: any = {};
    if (observations !== undefined) values.additional_note = observations;
    if (measure !== undefined) values.measure = measure;

    if (Object.keys(values).length === 0) {
      return resolve({ status: true, message: "No hay notas para guardar." });
    }

    console.log('Control de calidad: guardando notas', {
      id: quality_control.id,
      additional_note_length: observations?.length || 0,
      measure
    });

    const result = await writeOdooData(
      'quality.check',
      [quality_control.id],
      values,
      user.company_id
    );

    if (!result || !result.status) {
      return resolve({ status: false, message: result?.message || "Ocurrio un error al guardar las notas del control de calidad en Odoo." });
    }

    return resolve({ status: true, message: "Notas guardadas." });
  })
}
