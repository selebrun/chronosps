'use server'

import { createOdooData, executeOdooMethod, getOdooData, setOdooData } from '@/app/api/odoo/odooService';
import { isWorkOrderLocallyBlocked, markWorkOrderBlocked, markWorkOrderUnblocked } from '@/app/api/workOrderBlocks/workOrderBlocks';

function getOdooRecord(model: string, domain: any[], fields: string[], companyId: string): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(model, domain, fields, false, false, companyId, (data: any) => resolve(data), false);
  });
}

function callOdooMethod(model: string, method: string, args: any[], companyId: string): Promise<any> {
  return new Promise((resolve) => {
    executeOdooMethod(model, method, args, companyId, (data: any) => resolve(data));
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

function nowUtcString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function getOdooError(data: any, fallback: string) {
  return data?.message?.faultString || data?.message || fallback;
}

async function createProductivityBlock(workOrder: any, blockReason: any, user: any) {
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

  const values = {
    workorder_id: workOrder.id,
    workcenter_id: Array.isArray(workOrder.workcenter_id) ? workOrder.workcenter_id[0] : workOrder.workcenter_id,
    company_id: Array.isArray(workOrder.company_id) ? workOrder.company_id[0] : 1,
    user_id: 2,
    loss_id: reasonId,
    description: `Bloqueo: ${loss.name}`,
    date_start: nowUtcString(),
  };

  const created: any = await createOdooRecord('mrp.workcenter.productivity', values, user.company_id);
  if (!created?.status) {
    return { status: false, message: getOdooError(created, 'No se pudo bloquear la orden de trabajo en Odoo.') };
  }

  const localBlock = await markWorkOrderBlocked(user, workOrder, loss);
  if (!localBlock?.status) {
    return { status: false, message: 'Se registro el bloqueo en Odoo, pero no se pudo bloquear la OT en Piso.' };
  }

  return { status: true, message: 'Orden de trabajo bloqueada.' };
}

export async function updateOrder(
  user: any,
  workorder: any,
  action: string,
  block_reason: any = false,
  qtyDone: number | undefined = 0
): Promise<any> {
  try {
    const workorders: any = await getOdooRecord(
      'mrp.workorder',
      [['id', '=', workorder.id]],
      ['id', 'name', 'state', 'production_id', 'duration', 'duration_expected', 'operation_note', 'working_state', 'workcenter_id', 'company_id', 'is_user_working', 'employee_assigned_ids'],
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

    if (action === 'finish_work_order' && (!qtyDone || qtyDone < 1)) {
      return { status: false, message: 'Debe definir la cantidad producida.' };
    }

    const isLocallyBlocked = await isWorkOrderLocallyBlocked(user, work_order.id);
    if (isLocallyBlocked && action !== 'unblock_work_order') {
      return {
        status: false,
        message: 'La orden de trabajo esta bloqueada en Piso. Solo un Lider o Jefe puede desbloquearla.',
        faultString: 'La orden de trabajo esta bloqueada en Piso. Solo un Lider o Jefe puede desbloquearla.',
      };
    }

    if (action === 'unblock_work_order' && !['Lider', 'Jefe'].includes(user.role)) {
      return {
        status: false,
        message: 'Solo los usuarios Lider o Jefe pueden desbloquear una orden de trabajo.',
        faultString: 'Solo los usuarios Lider o Jefe pueden desbloquear una orden de trabajo.',
      };
    }

    let response: any;
    console.log('Accion OT directa', {
      action,
      workorder_id: work_order.id,
      workorder_name: work_order.name,
      workorder_state: work_order.state,
      working_state: work_order.working_state,
      production_id: work_order.production_id?.[0],
    });

    switch (action) {
      case 'start_work_order':
        response = await callOdooMethod('mrp.workorder', 'button_start', [[workorder.id]], user.company_id);
        break;
      case 'stop_work_order':
        response = await callOdooMethod('mrp.workorder', 'button_pending', [[workorder.id]], user.company_id);
        break;
      case 'finish_work_order':
        await writeOdooData('mrp.production', [work_order.production_id[0]], { qty_producing: qtyDone }, user.company_id);
        response = await callOdooMethod('mrp.workorder', 'button_finish', [[workorder.id]], user.company_id);
        break;
      case 'unblock_work_order':
        if (work_order.working_state === 'blocked') {
          response = await callOdooMethod('mrp.workorder', 'button_unblock', [[workorder.id]], user.company_id);
          if (!response?.status) {
            const errorMsg = getOdooError(response, 'Error ejecutando accion en Odoo');
            return { status: false, message: errorMsg, faultString: errorMsg };
          }
        }
        await markWorkOrderUnblocked(user, work_order.id);
        return { status: true, message: 'Orden de trabajo desbloqueada.' };
      case 'block_work_order':
        return createProductivityBlock(work_order, block_reason, user);
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
