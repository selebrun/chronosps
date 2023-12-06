'use server'

import { getOdooData } from '@/app/api/odoo/odooService';

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

