'use server'

import { createOdooData, executeOdooMethod, getOdooData, setOdooData } from '@/app/api/odoo/odooService';
import { getDefaultOdooUserId } from '@/app/api/odoo/defaultOdooUser';
import { getActiveWorkOrderBlocks, isWorkOrderLocallyBlocked, markWorkOrderBlocked, markWorkOrderUnblocked } from '@/app/api/workOrderBlocks/workOrderBlocks';
import { saveWorkOrderTimerSnapshot } from '@/app/api/workOrderTimers/workOrderTimers';

const WORK_ORDER_FIELDS = ['id', 'name', 'state', 'production_id', 'duration', 'duration_expected', 'operation_note', 'working_state', 'workcenter_id', 'company_id', 'is_user_working', 'employee_assigned_ids', 'sequence'];
const WORK_ORDER_REQUIRED_FIELDS = WORK_ORDER_FIELDS.filter((field) => field !== 'operation_note');
const workOrderFieldsByCompany = new Map<string, string[]>();

function getOdooRecord(model: string, domain: any[], fields: string[], companyId: string): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(model, domain, fields, false, false, companyId, (data: any) => resolve(data), false);
  });
}

function callOdooMethod(model: string, method: string, args: any[], companyId: string, kwargs: any = false): Promise<any> {
  return new Promise((resolve) => {
    executeOdooMethod(model, method, args, companyId, (data: any) => resolve(data), kwargs);
  });
}

async function getCompatibleWorkOrderFields(companyId: string) {
  const cacheKey = String(companyId || '').trim();
  const cachedFields = workOrderFieldsByCompany.get(cacheKey);
  if (cachedFields) return cachedFields;

  const fieldsResponse = await callOdooMethod(
    'mrp.workorder',
    'fields_get',
    [],
    companyId,
    { attributes: ['type'] }
  );
  const availableFields = fieldsResponse?.status && fieldsResponse?.data
    ? new Set(Object.keys(fieldsResponse.data))
    : null;
  const compatibleFields = availableFields
    ? WORK_ORDER_FIELDS.filter((field) => availableFields.has(field))
    : WORK_ORDER_REQUIRED_FIELDS;

  workOrderFieldsByCompany.set(cacheKey, compatibleFields);
  return compatibleFields;
}

function writeOdooData(model: string, ids: any[], values: any, companyId: string): Promise<any> {
  return new Promise((resolve) => {
    setOdooData(model, ids, values, companyId, (data: any) => resolve(data));
  });
}

function createOdooRecord(model: string, values: any, companyId: string): Promise<any> {
  return new Promise((resolve) => {
    createOdooData(model, values, companyId, (data: any) => resolve(data), false);
  });
}

function getMany2OneId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeElapsedSeconds(value: any, fallbackMinutes = 0) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds);
  return Math.max(0, Math.round(Number(fallbackMinutes || 0) * 60));
}

async function saveTimerSnapshot(
  user: any,
  workOrder: any,
  elapsedSeconds: any,
  isRunning: boolean,
  activeSince?: string | null
) {
  const result = await saveWorkOrderTimerSnapshot(
    user,
    Number(workOrder?.id),
    normalizeElapsedSeconds(elapsedSeconds, workOrder?.duration),
    isRunning,
    activeSince
  );

  if (!result?.status) {
    throw new Error('No se pudo guardar el tiempo compartido de la orden de trabajo en Piso.');
  }

  return { elapsed_seconds: Number((result as any).elapsed_seconds) || 0 };
}

async function getCurrentOdooProductivityStart(workOrderId: number, companyId: string) {
  const productivityResponse: any = await getOdooRecord(
    'mrp.workcenter.productivity',
    [['workorder_id', '=', workOrderId], ['date_end', '=', false]],
    ['id', 'date_start', 'loss_id'],
    companyId
  );

  return (productivityResponse?.data || [])
    .filter((record: any) => !getMany2OneId(record?.loss_id))
    .sort((left: any, right: any) => String(right?.date_start || '').localeCompare(String(left?.date_start || '')))[0]
    ?.date_start || null;
}

function getWorkOrderSequence(workOrder: any) {
  const sequence = Number(workOrder?.sequence);
  return Number.isFinite(sequence) ? sequence : Number(workOrder?.id) || 0;
}

function getWorkOrderLabel(workOrder: any) {
  const sequence = getWorkOrderSequence(workOrder);
  return sequence ? `OT ${sequence} - ${workOrder?.name || workOrder?.id}` : workOrder?.name || workOrder?.id || 'N/A';
}

async function validatePreviousWorkOrdersDone(workOrder: any, companyId: string) {
  const productionId = getMany2OneId(workOrder?.production_id);
  const currentSequence = getWorkOrderSequence(workOrder);

  if (!productionId || !currentSequence) {
    return { status: true };
  }

  const workOrders: any = await getOdooRecord(
    'mrp.workorder',
    [['production_id', '=', productionId]],
    ['id', 'name', 'state', 'sequence'],
    companyId
  );

  if (!workOrders?.data?.length) {
    return { status: true };
  }

  const previousPendingWorkOrder = workOrders.data
    .filter((item: any) => Number(item?.id) !== Number(workOrder.id))
    .filter((item: any) => getWorkOrderSequence(item) < currentSequence)
    .filter((item: any) => !['done', 'completed'].includes(item?.state))
    .sort((a: any, b: any) => getWorkOrderSequence(a) - getWorkOrderSequence(b))[0];

  if (!previousPendingWorkOrder) {
    return { status: true };
  }

  const message = `No puede iniciar esta orden de trabajo. Primero debe terminar la operacion anterior: ${getWorkOrderLabel(previousPendingWorkOrder)}.`;
  return { status: false, message, faultString: message };
}

async function hasFailedQualityChecks(workOrderId: number, companyId: string) {
  const qualityChecks: any = await getOdooRecord(
    'quality.check',
    [['workorder_id', '=', workOrderId], ['quality_state', '=', 'fail']],
    ['id', 'name'],
    companyId
  );

  return Boolean(qualityChecks?.data?.length);
}

async function releaseFailedQualityChecks(workOrderId: number, user: any) {
  const qualityChecks: any = await getOdooRecord(
    'quality.check',
    [['workorder_id', '=', workOrderId], ['quality_state', '=', 'fail']],
    ['id', 'name'],
    user.company_id
  );
  const qualityCheckIds = (qualityChecks?.data || []).map((check: any) => check.id).filter(Boolean);

  if (!qualityCheckIds.length) {
    return { status: true, message: 'La orden de trabajo no tiene controles de calidad fallidos.' };
  }

  const result: any = await writeOdooData(
    'quality.check',
    qualityCheckIds,
    { quality_state: 'none' },
    user.company_id
  );

  if (!result?.status) {
    return { status: false, message: getOdooError(result, 'No se pudo reactivar la orden de trabajo.') };
  }

  const pauseResponse = await pauseWorkOrderIfRunning({ id: workOrderId }, user);
  if (!pauseResponse?.status) {
    return { status: false, message: `Se reactivo la orden, pero no se pudo pausar la OT: ${pauseResponse.message}` };
  }

  return { status: true, message: 'Orden de trabajo reactivada para retrabajo. El reloj permanece detenido hasta iniciar o reanudar.' };
}

function nowUtcString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseOdooDate(value: any) {
  if (!value) return null;
  const date = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toOdooDate(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getProductivitySeconds(productivity: any, fallbackEnd: Date) {
  const start = parseOdooDate(productivity?.date_start);
  const end = parseOdooDate(productivity?.date_end) || fallbackEnd;
  if (start && end) {
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  }

  const durationMinutes = Number(productivity?.duration);
  return Number.isFinite(durationMinutes) && durationMinutes > 0
    ? Math.round(durationMinutes * 60)
    : 0;
}

async function synchronizeWorkOrderDurationToOdoo(user: any, workOrderId: number, elapsedSeconds: number) {
  const targetElapsedSeconds = Math.max(0, Math.round(Number(elapsedSeconds) || 0));
  const directWrite: any = await writeOdooData(
    'mrp.workorder',
    [workOrderId],
    { duration: targetElapsedSeconds / 60 },
    user.company_id
  );

  if (directWrite?.status) {
    const refreshedWorkOrder = await getFreshWorkOrder(workOrderId, user.company_id);
    const odooElapsedSeconds = Math.max(0, Math.round(Number(refreshedWorkOrder?.duration || 0) * 60));
    if (Math.abs(odooElapsedSeconds - targetElapsedSeconds) <= 1) {
      console.log('Tiempo OT sincronizado Piso/Odoo', {
        workorder_id: workOrderId,
        elapsed_seconds: targetElapsedSeconds,
        strategy: 'mrp.workorder.duration',
      });
      return { status: true };
    }
  }

  // Algunas versiones de Odoo calculan duration desde las lineas de
  // productividad. En ese caso se ajustan como respaldo, excluyendo solamente
  // los registros que Piso creo explicitamente para un bloqueo.
  const productivityResponse: any = await getOdooRecord(
    'mrp.workcenter.productivity',
    [['workorder_id', '=', workOrderId]],
    ['id', 'date_start', 'date_end', 'duration', 'description'],
    user.company_id
  );
  const synchronizedAt = new Date();
  const productiveRecords = (productivityResponse?.data || [])
    .filter((record: any) => !String(record?.description || '').trim().toLowerCase().startsWith('bloqueo:'))
    .map((record: any) => ({
      ...record,
      seconds: getProductivitySeconds(record, synchronizedAt),
      end: parseOdooDate(record?.date_end) || synchronizedAt,
    }))
    .sort((left: any, right: any) => right.end.getTime() - left.end.getTime());

  if (!productiveRecords.length) {
    return {
      status: false,
      message: getOdooError(
        directWrite,
        'Odoo no permitio actualizar la duracion de la OT ni devolvio registros de tiempo para ajustarla.'
      ),
    };
  }

  let remainingSeconds = targetElapsedSeconds;
  for (let index = 0; index < productiveRecords.length; index += 1) {
    const productivity = productiveRecords[index];
    let targetSeconds = Math.min(productivity.seconds, remainingSeconds);
    remainingSeconds -= targetSeconds;

    // Si Piso tiene mas tiempo que Odoo, la diferencia se asigna al ultimo
    // tramo productivo sin alterar los registros de bloqueo.
    if (index === 0 && remainingSeconds > 0) {
      targetSeconds += remainingSeconds;
      remainingSeconds = 0;
    }

    if (targetSeconds === productivity.seconds && productivity.date_end) continue;

    const targetStart = new Date(productivity.end.getTime() - targetSeconds * 1000);
    const updateResponse: any = await writeOdooData(
      'mrp.workcenter.productivity',
      [productivity.id],
      { date_start: toOdooDate(targetStart), date_end: toOdooDate(productivity.end) },
      user.company_id
    );
    if (!updateResponse?.status) {
      return { status: false, message: getOdooError(updateResponse, 'No se pudo sincronizar el tiempo productivo en Odoo.') };
    }
  }

  console.log('Tiempo OT sincronizado Piso/Odoo', {
    workorder_id: workOrderId,
    elapsed_seconds: targetElapsedSeconds,
    productive_records: productiveRecords.length,
    strategy: 'mrp.workcenter.productivity',
  });
  return { status: true };
}

async function saveAndSynchronizePausedTimer(user: any, workOrder: any, elapsedSeconds: any) {
  const snapshot = await saveTimerSnapshot(user, workOrder, elapsedSeconds, false);
  try {
    const synchronization = await synchronizeWorkOrderDurationToOdoo(
      user,
      Number(workOrder?.id),
      Number(snapshot.elapsed_seconds) || 0
    );

    if (!synchronization.status) {
      console.error('No se pudo conciliar el tiempo de Piso en Odoo', {
        workorder_id: workOrder?.id,
        piso_elapsed_seconds: snapshot.elapsed_seconds,
        message: synchronization.message,
      });
      return { ...snapshot, synchronized: false, synchronization_message: synchronization.message };
    }
  } catch (error) {
    console.error('Error conciliando el tiempo de Piso en Odoo', {
      workorder_id: workOrder?.id,
      piso_elapsed_seconds: snapshot.elapsed_seconds,
      error,
    });
    return { ...snapshot, synchronized: false, synchronization_message: error instanceof Error ? error.message : 'Error inesperado de sincronizacion.' };
  }

  return { ...snapshot, synchronized: true };
}

function getOdooError(data: any, fallback: string) {
  return data?.message?.faultString || data?.message || fallback;
}

function isQualityControlError(message: string) {
  const normalizedMessage = (message || '').toLowerCase();
  return normalizedMessage.includes('calidad') || normalizedMessage.includes('quality');
}

function getQualityPauseMessage(message: string, paused: boolean) {
  const baseMessage = (message || 'Debe completar los controles de calidad antes de marcar la orden de trabajo como lista.')
    .replace('usando el taller', 'usando el módulo de calidad');

  if (!paused) {
    return `${baseMessage} No se pudo pausar automaticamente la orden de trabajo; verifique la OT en Odoo.`;
  }

  if (baseMessage.toLowerCase().includes('fue pausada')) {
    return baseMessage;
  }

  return `${baseMessage} La orden de trabajo fue pausada para realizar los controles de calidad.`;
}

async function getOdooActionKwargs(user: any) {
  const context: any = {};
  if (user?.odoo_id) context.employee_id = Number(user.odoo_id);
  context.user_id = await getOdooExecutionUserId(user);

  return Object.keys(context).length ? { context } : false;
}

async function getOdooExecutionUserId(user: any) {
  const defaultUserId = await getDefaultOdooUserId(user?.company_id);
  if (user?.role === 'Operario') return defaultUserId;
  return Number(user?.odoo_user_id) || defaultUserId;
}

async function getFreshWorkOrder(workOrderId: number, companyId: string) {
  const fields = await getCompatibleWorkOrderFields(companyId);
  const workOrders: any = await getOdooRecord(
    'mrp.workorder',
    [['id', '=', workOrderId]],
    fields,
    companyId
  );

  return workOrders?.data?.[0] || null;
}

async function pauseWorkOrderIfRunning(workOrder: any, user: any) {
  const workOrderId = Number(workOrder?.id);
  if (!workOrderId) return { status: true, paused: false };

  const freshWorkOrder = await getFreshWorkOrder(workOrderId, user.company_id);
  if (!freshWorkOrder?.is_user_working) {
    return { status: true, paused: false };
  }

  const response: any = await callOdooMethod('mrp.workorder', 'button_pending', [[workOrderId]], user.company_id, await getOdooActionKwargs(user));
  if (!response?.status) {
    return { status: false, paused: false, message: getOdooError(response, 'No se pudo pausar la orden de trabajo en Odoo.') };
  }

  return { status: true, paused: true };
}

async function closeActiveProductivityBlocks(workOrderId: number, companyId: string) {
  const activeBlocks: any = await getOdooRecord(
    'mrp.workcenter.productivity',
    [
      ['workorder_id', '=', workOrderId],
      ['description', 'ilike', 'Bloqueo:'],
      ['date_end', '=', false],
    ],
    ['id'],
    companyId
  );
  const ids = (activeBlocks?.data || []).map((record: any) => record.id).filter(Boolean);
  if (!ids.length) return { status: true, closed_count: 0 };

  const result: any = await writeOdooData(
    'mrp.workcenter.productivity',
    ids,
    { date_end: nowUtcString() },
    companyId
  );

  if (!result?.status) {
    return { status: false, message: getOdooError(result, 'No se pudo cerrar el registro de bloqueo en Odoo.') };
  }

  return { status: true, closed_count: ids.length };
}

async function createClosedProductivityBlock(workOrder: any, block: any, user: any) {
  const reasonId = Number(block?.reason_id);
  const blockedAt = String(block?.blocked_at || '').trim().replace('T', ' ').replace(/Z$/, '').slice(0, 19);
  if (!reasonId || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(blockedAt)) {
    return { status: false, message: 'No se encontraron los datos del bloqueo para registrar su seguimiento en Odoo.' };
  }

  const values = {
    workorder_id: workOrder.id,
    workcenter_id: getMany2OneId(workOrder.workcenter_id),
    company_id: getMany2OneId(workOrder.company_id) || 1,
    user_id: await getOdooExecutionUserId(user),
    loss_id: reasonId,
    description: `Bloqueo: ${block.reason_name || reasonId}`,
    date_start: blockedAt,
    date_end: nowUtcString(),
  };

  const created: any = await createOdooRecord('mrp.workcenter.productivity', values, user.company_id);
  if (!created?.status) {
    return { status: false, message: getOdooError(created, 'No se pudo registrar el seguimiento del bloqueo en Odoo.') };
  }

  return { status: true };
}

async function blockWorkOrder(workOrder: any, blockReason: any, user: any) {
  const reasonId = parseInt(blockReason);
  if (!reasonId) {
    return { status: false, message: 'Debe seleccionar un motivo de bloqueo.' };
  }

  const lossData: any = await getOdooRecord(
    'mrp.workcenter.productivity.loss',
    [['id', '=', reasonId]],
    ['id', 'name', 'loss_type'],
    user.company_id
  );
  const loss = lossData?.data?.[0];
  if (!loss) {
    return { status: false, message: 'No se encontro el motivo de bloqueo en Odoo.' };
  }

  // Primero se detiene el tiempo productivo de Odoo. El intervalo de bloqueo se
  // conserva en Piso y se envia cerrado a Odoo cuando el Jefe desbloquea.
  const pauseResponse = await pauseWorkOrderIfRunning(workOrder, user);
  if (!pauseResponse?.status) {
    return { status: false, message: `No se pudo pausar la OT antes de bloquearla: ${pauseResponse.message}` };
  }

  const localBlock = await markWorkOrderBlocked(user, workOrder, loss);
  if (!localBlock?.status) {
    return { status: false, message: 'No se pudo bloquear la orden de trabajo en Piso.' };
  }

  return { status: true, message: 'Orden de trabajo bloqueada.' };
}

export async function updateOrder(
  user: any,
  workorder: any,
  action: string,
  block_reason: any = false,
  qtyDone: number | undefined = 0,
  elapsedSeconds?: number
): Promise<any> {
  try {
    const workOrderFields = await getCompatibleWorkOrderFields(user.company_id);
    const workorders: any = await getOdooRecord(
      'mrp.workorder',
      [['id', '=', workorder.id]],
      workOrderFields,
      user.company_id
    );
    const work_order = workorders?.data?.[0];

    if (!work_order) {
      return { status: false, message: 'No se encontro la orden de trabajo en Odoo.' };
    }

    switch (user.role) {
      case 'Operario':
      case 'Lider':
      case 'Jefe':
        break;
      default:
        return { status: false, message: 'Usted no tiene definido un tipo de usuario.' };
    }

    if (action === 'start_work_order' && work_order.employee_assigned_ids.length === 0) {
      return { status: false, message: 'No hay operario asignado a esta orden de trabajo. Asigne un operario antes de iniciar.' };
    }

    if (action === 'start_work_order') {
      const previousWorkOrdersValidation = await validatePreviousWorkOrdersDone(work_order, user.company_id);
      if (!previousWorkOrdersValidation.status) {
        return previousWorkOrdersValidation;
      }
    }

    if (action === 'finish_work_order' && (!qtyDone || qtyDone < 1)) {
      return { status: false, message: 'Debe definir la cantidad producida.' };
    }

    const isLocallyBlocked = await isWorkOrderLocallyBlocked(user, work_order.id);
    if (isLocallyBlocked && action !== 'unblock_work_order') {
      return {
        status: false,
        message: 'La orden de trabajo esta bloqueada en Piso. Solo un Jefe puede desbloquearla.',
        faultString: 'La orden de trabajo esta bloqueada en Piso. Solo un Jefe puede desbloquearla.',
      };
    }

    if (['start_work_order', 'finish_work_order'].includes(action) && user.role === 'Operario') {
      const hasFailedQuality = await hasFailedQualityChecks(work_order.id, user.company_id);
      if (hasFailedQuality) {
        return {
          status: false,
          message: 'Esta orden de trabajo tiene un control de calidad fallado. Un Lider o Calidad debe revisar antes de continuar.',
          faultString: 'Esta orden de trabajo tiene un control de calidad fallado. Un Lider o Calidad debe revisar antes de continuar.',
        };
      }
    }

    if (action === 'unblock_work_order' && user.role !== 'Jefe') {
      return {
        status: false,
        message: 'Solo los usuarios Jefe pueden desbloquear una orden de trabajo.',
        faultString: 'Solo los usuarios Jefe pueden desbloquear una orden de trabajo.',
      };
    }

    if (action === 'release_quality_failure' && !['Lider', 'Jefe'].includes(user.role)) {
      return {
        status: false,
        message: 'Solo Lider o Jefe pueden reactivar una orden con control de calidad fallido.',
        faultString: 'Solo Lider o Jefe pueden reactivar una orden con control de calidad fallido.',
      };
    }

    if (['done', 'completed', 'cancel'].includes(work_order.state) && !['unblock_work_order', 'release_quality_failure'].includes(action)) {
      return {
        status: false,
        message: 'La orden de trabajo ya esta terminada o cancelada. No se pueden ejecutar mas acciones desde Piso.',
        faultString: 'La orden de trabajo ya esta terminada o cancelada. No se pueden ejecutar mas acciones desde Piso.',
      };
    }

    let response: any;
    const odooExecutionUserId = await getOdooExecutionUserId(user);
    console.log('Accion OT directa', {
      action,
      workorder_id: work_order.id,
      workorder_name: work_order.name,
      workorder_state: work_order.state,
      working_state: work_order.working_state,
      production_id: work_order.production_id?.[0],
      odoo_context_user_id: odooExecutionUserId,
      odoo_employee_id: Number(user?.odoo_id) || null,
    });

    switch (action) {
      case 'start_work_order':
        response = await callOdooMethod('mrp.workorder', 'button_start', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
        if (response?.status) {
          const odooProductivityStart = await getCurrentOdooProductivityStart(work_order.id, user.company_id);
          await saveTimerSnapshot(user, work_order, elapsedSeconds, true, odooProductivityStart);
        }
        break;
      case 'stop_work_order':
        response = await callOdooMethod('mrp.workorder', 'button_pending', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
        if (response?.status) {
          await saveAndSynchronizePausedTimer(user, work_order, elapsedSeconds);
        }
        break;
      case 'finish_work_order':
        await writeOdooData('mrp.production', [work_order.production_id[0]], { qty_producing: qtyDone }, user.company_id);
        response = await callOdooMethod('mrp.workorder', 'button_finish', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
        if (response?.status) {
          await saveAndSynchronizePausedTimer(user, work_order, elapsedSeconds);
        }
        if (!response?.status) {
          const errorMsg = getOdooError(response, 'Error ejecutando accion en Odoo');
          if (isQualityControlError(errorMsg)) {
            let pauseResponse: any = { status: true };
            if (work_order.is_user_working) {
              pauseResponse = await callOdooMethod('mrp.workorder', 'button_pending', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
            }
            const paused = !work_order.is_user_working || Boolean(pauseResponse?.status);
            if (paused) {
              try {
                await saveAndSynchronizePausedTimer(user, work_order, elapsedSeconds);
              } catch (timerError) {
                // El bloqueo funcional de Calidad no puede ocultarse si falla
                // una sincronizacion secundaria de tiempo.
                console.error('No se pudo congelar el reloj de Piso tras el bloqueo de Calidad:', timerError);
              }
            }
            const message = getQualityPauseMessage(errorMsg, paused);
            return {
              status: false,
              message,
              faultString: message,
              qualityPause: true,
              paused,
            };
          }
        }
        break;
      case 'unblock_work_order':
        {
          const activeBlocks = await getActiveWorkOrderBlocks(user, [work_order.id]);
          const activeBlock = activeBlocks.get(Number(work_order.id));

          if (work_order.working_state === 'blocked') {
            response = await callOdooMethod('mrp.workorder', 'button_unblock', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
            if (!response?.status) {
              const errorMsg = getOdooError(response, 'Error ejecutando accion en Odoo');
              return { status: false, message: errorMsg, faultString: errorMsg };
            }
          }
          {
            const pauseResponse = await pauseWorkOrderIfRunning(work_order, user);
            if (!pauseResponse?.status) {
              return { status: false, message: `La orden fue desbloqueada, pero no se pudo pausar la OT: ${pauseResponse.message}` };
            }
          }
          {
            const closeBlockResponse = await closeActiveProductivityBlocks(work_order.id, user.company_id);
            if (!closeBlockResponse?.status) {
              return { status: false, message: closeBlockResponse.message };
            }
            if (!Number((closeBlockResponse as any).closed_count) && activeBlock) {
              const trackingResponse = await createClosedProductivityBlock(work_order, activeBlock, user);
              if (!trackingResponse?.status) {
                return { status: false, message: trackingResponse.message };
              }
            }
          }
          await markWorkOrderUnblocked(user, work_order.id);
          await saveTimerSnapshot(user, work_order, elapsedSeconds, false);
          return { status: true, message: 'Orden de trabajo desbloqueada. El reloj permanece detenido hasta iniciar o reanudar.' };
        }
      case 'block_work_order':
        {
          const blockResponse = await blockWorkOrder(work_order, block_reason, user);
          if (blockResponse?.status) {
            await saveAndSynchronizePausedTimer(user, work_order, elapsedSeconds);
          }
          return blockResponse;
        }
      case 'release_quality_failure':
        {
          const releaseResponse = await releaseFailedQualityChecks(work_order.id, user);
          if (releaseResponse?.status) {
            await saveAndSynchronizePausedTimer(user, work_order, elapsedSeconds);
          }
          return releaseResponse;
        }
      default:
        return { status: false, message: 'No se encontro la accion que desea ejecutar.' };
    }

    if (!response?.status) {
      const errorMsg = getOdooError(response, 'Error ejecutando accion en Odoo');
      return { status: false, message: errorMsg, faultString: errorMsg };
    }

    return { status: true, message: 'Accion realizada con exito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hubo un error al procesar la orden.';
    console.error('Error en la funcion updateOrder:', {
      action,
      workorder_id: workorder?.id,
      message,
      error,
    });
    return { status: false, message, faultString: message };
  }
}
