'use server'
import { getOdooData, createOdooData } from '@/app/api/odoo/odooService';

export async function getMaterialsOrder (user: any, move_raw_ids: any ): Promise<any>{
  return new Promise(async (resolve, reject) => {
    getOdooData(
      'stock.move',
      [['id','in',move_raw_ids]],
      ['id','product_id','location_id','product_uom_qty','product_uom','forecast_availability','quantity_done'],
      false,
      false,
      user.company_id,
      async (bom_products: any) => {
        if(!bom_products || !bom_products.data || !bom_products.data[0]) return resolve({status: false, message: 'No se encontraron lineas del bom.', data: false})
        return resolve({status: true, message: '', data: bom_products.data})
      })
  })
}

export async function saveMaterialsOrder (user: any, workorder_id: any, production_id: any, product_id: any, product_qty:any, uom: any, materials: any   ): Promise<any>{
  return new Promise(async (resolve, reject) => {
    if (!user.materiales ) return resolve({status: false, message: 'Su usuario no tiene permitido añadir materiales adicionales al BOM. Contacte con un supervisor.',})
    createOdooData(
      'x_acciones_remotas',
      {
        x_studio_ejecutado_por: user.odoo_id, 
        x_studio_workorder_id: workorder_id, 
        x_studio_production: production_id, 
        x_studio_accion_a_ejecutar: 'new_material',
         x_studio_new_material: product_id, 
         x_studio_new_material_qty: product_qty, 
         x_studio_new_material_uom: uom},
      user.company_id,
      async (bom_products: any) => {
        return resolve({status: true, message: 'Agregado',})
      })
  })
}

