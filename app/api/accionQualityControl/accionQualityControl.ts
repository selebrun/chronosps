'use server'
import { setOdooData } from '@/app/api/odoo/odooService';

function writeOdooData(model: string, ids: any[], values: any, companyId: string): Promise<any> {
  return new Promise((resolve) => {
    setOdooData(model, ids, values, companyId, (data: any) => resolve(data));
  });
}

async function updateQualityControl(
  user: any,
  quality_control: any,
  qualityState: 'pass' | 'fail',
  observations?: string,
  measure?: number
) {
  if (!quality_control?.id) {
    return { status: false, message: "No se encontro el control de calidad seleccionado." };
  }

  const qualityControlId = quality_control.id;
  const detailValues: any = {};
  if (observations !== undefined) detailValues.additional_note = observations;
  if (measure !== undefined) detailValues.measure = measure;

  console.log('Control de calidad: actualizando', {
    id: qualityControlId,
    quality_state: qualityState,
    additional_note_length: observations?.length || 0,
    measure
  });

  const stateResult = await writeOdooData(
    'quality.check',
    [qualityControlId],
    { quality_state: qualityState },
    user.company_id
  );

  if (!stateResult || !stateResult.status) {
    return { status: false, message: stateResult?.message || "Ocurrio un error al actualizar el estado del control de calidad en Odoo." };
  }

  if (Object.keys(detailValues).length === 0) {
    return { status: true };
  }

  const detailResult = await writeOdooData(
    'quality.check',
    [qualityControlId],
    detailValues,
    user.company_id
  );

  if (!detailResult || !detailResult.status) {
    return { status: false, message: detailResult?.message || "Ocurrio un error al guardar la nota adicional del control de calidad en Odoo." };
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
