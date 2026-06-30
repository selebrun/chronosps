'use server'
import { getDefaultOdooUserId } from '@/app/api/odoo/defaultOdooUser';
import { createOdooData, executeOdooMethod, getOdooData } from '@/app/api/odoo/odooService';

async function getOdooExecutionUserId(user: any) {
  const defaultUserId = await getDefaultOdooUserId(user?.company_id);
  if (user?.role === 'Operario') return defaultUserId;
  return Number(user?.odoo_user_id) || defaultUserId;
}

function callOdooMethod(model: string, method: string, args: any[], companyId: string, uidOverride: number | false = false): Promise<any> {
  return new Promise((resolve) => {
    executeOdooMethod(model, method, args, companyId, (data: any) => resolve(data), false, uidOverride);
  });
}

function getOdooError(data: any, fallback: string) {
  return data?.message?.faultString || data?.message || fallback;
}

function getMany2OneId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getMaterialsOrder(user: any, move_raw_ids: any, workorder?: any): Promise<any> {
  return new Promise(async (resolve) => {
    const workOrderOperationId = Number(getMany2OneId(workorder?.operation_id)) || 0;

    getOdooData(
      'stock.move',
      [['id', 'in', move_raw_ids]],
      ['id', 'name', 'product_id', 'location_id', 'location_dest_id', 'company_id', 'product_uom_qty', 'product_uom', 'forecast_availability', 'operation_id'],
      false,
      false,
      user.company_id,
      async (bom_products: any) => {
        if (!bom_products || !bom_products.data || !bom_products.data[0]) {
          return resolve({ status: false, message: 'No se encontraron lineas del bom.', data: false });
        }

        const operationProducts = workOrderOperationId
          ? bom_products.data.filter((move: any) => Number(getMany2OneId(move?.operation_id)) === workOrderOperationId)
          : [];

        return resolve({ status: true, message: '', data: operationProducts.length ? operationProducts : bom_products.data });
      },
      false
    );
  });
}

export async function saveMaterialsOrder(
  user: any,
  workorder_id: any,
  production_id: any,
  product_id: any,
  uom: any,
  product_qty: any,
  location_id: any,
  location_dest_id: any,
  company_id: any,
  product_name?: string,
  operation_id?: any
): Promise<any> {
  return new Promise(async (resolve) => {
    if (!user.materiales) {
      return resolve({
        status: false,
        message: 'Su usuario no tiene permitido anadir materiales adicionales al BOM. Contacte con un supervisor.',
      });
    }

    if (!workorder_id || !production_id || !product_id || !uom || !product_qty || !location_id || !location_dest_id || !company_id) {
      return resolve({
        status: false,
        message: 'Faltan datos para agregar el material a la orden de produccion.',
      });
    }

    const values = {
      name: product_name || 'Material adicional',
      product_id,
      product_uom_qty: Number(product_qty),
      product_uom: uom,
      location_id,
      location_dest_id,
      raw_material_production_id: production_id,
      workorder_id,
      company_id,
      procure_method: 'make_to_stock',
    } as any;

    if (operation_id) values.operation_id = operation_id;

    const odooExecutionUserId = await getOdooExecutionUserId(user);

    createOdooData(
      'stock.move',
      values,
      user.company_id,
      async (moveResult: any) => {
        if (!moveResult || !moveResult.status) {
          const message = getOdooError(moveResult, 'Ocurrio un error al agregar el material en Odoo.');
          return resolve({ status: false, message });
        }

        const assignResult = await callOdooMethod('mrp.production', 'action_assign', [[production_id]], user.company_id, odooExecutionUserId);
        if (!assignResult?.status) {
          const message = getOdooError(assignResult, 'El material fue creado, pero no se pudo actualizar la disponibilidad de la OP.');
          return resolve({ status: false, message });
        }

        return resolve({ status: true, message: 'Agregado', data: moveResult.data });
      },
      false,
      odooExecutionUserId
    );
  });
}
