'use server'
import { getOdooData, createOdooData } from '@/app/api/odoo/odooService';

function createOdooDataWithTimeout(model: string, values: any, companyId: string, timeoutMs = 25000): Promise<any> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      resolve({
        status: false,
        message: 'Odoo no respondio al guardar el material. Revise si la accion remota se creo o si el modulo quedo procesando.',
      });
    }, timeoutMs);

    createOdooData(
      model,
      values,
      companyId,
      (data: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        resolve(data);
      },
      false
    );
  });
}

export async function getMaterialsOrder(user: any, move_raw_ids: any): Promise<any> {
  return new Promise(async (resolve) => {
    getOdooData(
      'stock.move',
      [['id', 'in', move_raw_ids]],
      ['id', 'product_id', 'location_id', 'product_uom_qty', 'product_uom', 'forecast_availability'],
      false,
      false,
      user.company_id,
      async (bom_products: any) => {
        if (!bom_products || !bom_products.data || !bom_products.data[0]) {
          return resolve({ status: false, message: 'No se encontraron lineas del bom.', data: false });
        }

        return resolve({ status: true, message: '', data: bom_products.data });
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
  product_qty: any
): Promise<any> {
  return new Promise(async (resolve) => {
    if (!user.materiales) {
      return resolve({
        status: false,
        message: 'Su usuario no tiene permitido anadir materiales adicionales al BOM. Contacte con un supervisor.',
      });
    }

    if (!workorder_id || !production_id || !product_id || !uom || !product_qty) {
      return resolve({
        status: false,
        message: 'Faltan datos para agregar el material a la orden de produccion.',
      });
    }

    const values = {
      x_studio_ejecutado_por: '1',
      x_studio_workorder_id: workorder_id,
      x_studio_production: production_id,
      x_studio_accion_a_ejecutar: 'new_material',
      x_studio_new_material: product_id,
      x_studio_new_material_qty: product_qty,
      x_studio_new_material_uom: uom,
    };

    console.log('Material adicional: creando accion remota', {
      workorder_id,
      production_id,
      product_id,
      uom,
      product_qty,
    });

    const materialsResult = await createOdooDataWithTimeout(
      'x_acciones_remotas',
      values,
      user.company_id
    );

    console.log('Material adicional: respuesta accion remota', materialsResult);

    if (!materialsResult || !materialsResult.status) {
      const message = materialsResult?.message?.faultString || materialsResult?.message || 'Ocurrio un error al agregar el material en Odoo.';
      return resolve({ status: false, message });
    }

    return resolve({ status: true, message: 'Agregado' });
  });
}
