'use server'
import { setOdooData } from '@/app/api/odoo/odooService';

function getOdooExecutionUserId(user: any) {
  if (user?.role === 'Operario') return 1;
  return Number(user?.odoo_user_id) || 1;
}

function writeOdooData(model: string, ids: any[], values: any, companyId: string, uidOverride: number | false = false): Promise<any> {
  return new Promise((resolve) => {
    setOdooData(model, ids, values, companyId, (data: any) => resolve(data), uidOverride);
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
    user.company_id,
    getOdooExecutionUserId(user)
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
    user.company_id,
    getOdooExecutionUserId(user)
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

export async function saveQualityControlNotes(user: any, quality_control: any, observations?: string, measure?: number): Promise<any> {
  return new Promise(async (resolve) => {
    if (!quality_control?.id) {
      return resolve({ status: false, message: "No se encontro el control de calidad seleccionado." });
    }

    const values: any = {};
    if (observations !== undefined) values.additional_note = observations;
    if (measure !== undefined) values.measure = measure;

    if (Object.keys(values).length === 0) {
      return resolve({ status: true, message: "No hay notas para guardar." });
    }

    console.log('Control de calidad: guardando notas', {
      id: quality_control.id,
      additional_note_length: observations?.length || 0,
      measure
    });

    const result = await writeOdooData(
      'quality.check',
      [quality_control.id],
      values,
      user.company_id,
      getOdooExecutionUserId(user)
    );

    if (!result || !result.status) {
      return resolve({ status: false, message: result?.message || "Ocurrio un error al guardar las notas del control de calidad en Odoo." });
    }

    return resolve({ status: true, message: "Notas guardadas." });
  })
}
