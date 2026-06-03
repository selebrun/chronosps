'use server'
import { setOdooData } from '@/app/api/odoo/odooService';

export async function acceptQualityControl (user: any, quality_control: any, observations?: string ): Promise<any>{
  return new Promise(async (resolve) => {
    if (!quality_control?.id) {
      return resolve({ status: false, message: "No se encontro el control de calidad seleccionado." });
    }

    const updateValues: any = { quality_state: 'pass' };
    if (observations !== undefined) updateValues.additional_note = observations;

    setOdooData(
      'quality.check',
      [quality_control.id],
      updateValues,
      user.company_id,
      async (data: any) => {
        if(!data || !data.status) return resolve({status: false, message: data?.message || "Ocurrio un error al aprobar el control de calidad en Odoo."})
        return resolve({status: true, message: "Control de calidad aprobado."})
      })
  })
}

export async function rejectQualityControl (user: any, quality_control: any, observations?: string ): Promise<any>{
  return new Promise(async (resolve) => {
    if (!quality_control?.id) {
      return resolve({ status: false, message: "No se encontro el control de calidad seleccionado." });
    }

    const updateValues: any = { quality_state: 'fail' };
    if (observations !== undefined) updateValues.additional_note = observations;

    setOdooData(
      'quality.check',
      [quality_control.id],
      updateValues,
      user.company_id,
      async (data: any) => {
        if(!data || !data.status) return resolve({status: false, message: data?.message || "Ocurrio un error al rechazar el control de calidad en Odoo."})
        return resolve({status: true, message: "Control de calidad rechazado."})
      })
  })
}
