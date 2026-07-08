'use server'

import { createOdooData, executeOdooMethod, getOdooData, setOdooData } from '@/app/api/odoo/odooService';
import { getDefaultOdooUserId } from '@/app/api/odoo/defaultOdooUser';
import { isWorkOrderLocallyBlocked, markWorkOrderBlocked, markWorkOrderUnblocked } from '@/app/api/workOrderBlocks/workOrderBlocks';
import { saveWorkOrderTimerSnapshot } from '@/app/api/workOrderTimers/workOrderTimers';

const WORK_ORDER_FIELDS = ['id', 'name', 'state', 'production_id', 'duration', 'duration_expected', 'operation_note', 'working_state', 'workcenter_id', 'company_id', 'is_user_working', 'employee_assigned_ids', 'sequence'];

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
  const workOrders: any = await getOdooRecord(
    'mrp.workorder',
    [['id', '=', workOrderId]],
    WORK_ORDER_FIELDS,
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

async function createProductivityBlock(workOrder: any, blockReason: any, user: any, elapsedSeconds?: number) {
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

  const executionUserId = await getOdooExecutionUserId(user);
  const values = {
    workorder_id: workOrder.id,
    workcenter_id: Array.isArray(workOrder.workcenter_id) ? workOrder.workcenter_id[0] : workOrder.workcenter_id,
    company_id: Array.isArray(workOrder.company_id) ? workOrder.company_id[0] : 1,
    user_id: executionUserId,
    loss_id: reasonId,
    description: `Bloqueo: ${loss.name}`,
    date_start: nowUtcString(),
  };

  const created: any = await createOdooRecord('mrp.workcenter.productivity', values, user.company_id);
  if (!created?.status) {
    return { status: false, message: getOdooError(created, 'No se pudo bloquear la orden de trabajo en Odoo.') };
  }

  const pauseResponse = await pauseWorkOrderIfRunning(workOrder, user);
  if (!pauseResponse?.status) {
    return { status: false, message: `Se registro el bloqueo, pero no se pudo pausar la OT: ${pauseResponse.message}` };
  }

  const localBlock = await markWorkOrderBlocked(user, workOrder, loss);
  if (!localBlock?.status) {
    return { status: false, message: 'Se registro el bloqueo en Odoo, pero no se pudo bloquear la OT en Piso.' };
  }

  await saveWorkOrderTimerSnapshot(user, workOrder.id, normalizeElapsedSeconds(elapsedSeconds, workOrder.duration), false);

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
    const workorders: any = await getOdooRecord(
      'mrp.workorder',
      [['id', '=', workorder.id]],
      WORK_ORDER_FIELDS,
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
          await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), true);
        }
        break;
      case 'stop_work_order':
        response = await callOdooMethod('mrp.workorder', 'button_pending', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
        if (response?.status) {
          await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), false);
        }
        break;
      case 'finish_work_order':
        await writeOdooData('mrp.production', [work_order.production_id[0]], { qty_producing: qtyDone }, user.company_id);
        response = await callOdooMethod('mrp.workorder', 'button_finish', [[workorder.id]], user.company_id, await getOdooActionKwargs(user));
        if (response?.status) {
          await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), false);
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
              await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), false);
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
        await markWorkOrderUnblocked(user, work_order.id);
        await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), false);
        return { status: true, message: 'Orden de trabajo desbloqueada. El reloj permanece detenido hasta iniciar o reanudar.' };
      case 'block_work_order':
        return createProductivityBlock(work_order, block_reason, user, elapsedSeconds);
      case 'release_quality_failure':
        {
          const releaseResponse = await releaseFailedQualityChecks(work_order.id, user);
          if (releaseResponse?.status) {
            await saveWorkOrderTimerSnapshot(user, work_order.id, normalizeElapsedSeconds(elapsedSeconds, work_order.duration), false);
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
    console.error('Error en la funcion updateOrder:', error);
    throw new Error('Hubo un error al procesar la orden.');
  }
}
