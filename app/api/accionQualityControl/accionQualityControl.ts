'use server'
import { createOdooData } from '@/app/api/odoo/odooService';

export async function acceptQualityControl (user: any, quality_control: any ): Promise<any>{
  return new Promise(async (resolve, reject) => {
    createOdooData(
      'x_acciones_remotas',
      {x_studio_ejecutado_por: user.odoo_id, x_studio_quality_control: 928, x_studio_accion_a_ejecutar: 'accept_quality_control'},
      user.company_id,
      async (data: any) => {
        if(!data || !data.status) return resolve({status: false, message: "Ocurrio un error al intentar ejecutar accion en Odoo."})
        return resolve({status: true, message: "Accion realizada con exito."})
      })
  })
}

export async function rejectQualityControl (user: any, quality_control: any ): Promise<any>{
  return new Promise(async (resolve, reject) => {
    createOdooData(
      'x_acciones_remotas',
      {x_studio_ejecutado_por: user.odoo_id, x_studio_quality_control: 928, x_studio_accion_a_ejecutar: 'reject_quality_control'},
      user.company_id,
      async (data: any) => {
        if(!data || !data.status) return resolve({status: false, message: "Ocurrio un error al intentar ejecutar accion en Odoo."})
        return resolve({status: true, message: "Accion realizada con exito."})
      })
  })
}