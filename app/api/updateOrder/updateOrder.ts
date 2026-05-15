'use server'

import { getOdooData, createOdooData } from '@/app/api/odoo/odooService';

export async function updateOrder (user: any, workorder: any, action: string, block_reason: any = false, qtyDone: number | undefined = 0): Promise<any>{
  try {
    return new Promise(async (resolve, reject) => {
      getOdooData(
        'mrp.workorder',
        [['id','=', workorder.id]],
        ['id','name','state','production_id','duration','duration_expected','operation_note','working_state','workcenter_id','is_user_working', 'employee_assigned_ids'],
        false,
        false,
        user.company_id,
        async (workorders: any) => {
          const work_order = workorders.data[0]
          switch(user.role) {
            case 'Operario':
              // if(work_order.employee_assigned_ids[0] != user.odoo_id) return  resolve({ status: false, message: 'Usted no tiene autorizacion para realizar acciones sobre esta orden.' });
              break
            case 'Lider':
            case 'Jefe':
              break
            default:
              resolve({ status: false, message: 'Usted no tiene definido un tipo de usuario.' });
              return
          }
          switch(action) {
            case 'start_work_order':
              // Validate that operator is assigned
              if(work_order.employee_assigned_ids.length === 0) {
                return resolve({status: false, message: "No hay operario asignado a esta orden de trabajo. Asigne un operario antes de iniciar."})
              }
              break
            case 'stop_work_order':
              break
            case 'finish_work_order':
              if(!qtyDone || qtyDone < 1) return resolve({status: false, message: "Debe definir la cantidad producida."})
              break
            case 'unblock_work_order':
              // Allow operators to unblock if they are assigned to this work order
              if(user.role === 'Operario') {
                const isAssignedOperator = work_order.employee_assigned_ids.some((empId: any) => empId === user.odoo_id)
                if(!isAssignedOperator) {
                  return resolve({status: false, message: "Solo los operarios asignados a esta orden pueden desbloquearla.", faultString: "Solo los operarios asignados a esta orden pueden desbloquearla."})
                }
              }
              break
            case 'block_work_order':
              break
            default:
              resolve({status: false, message: "No se encontro la accion que desea ejecutar."})
              return
          }

          const blockReason = block_reason === false ?   false : parseInt(block_reason)
            createOdooData('x_acciones_remotas', 
            {x_studio_ejecutado_por: "1",  //user.odoo_id, 
              x_studio_workorder_id: workorder.id, 
              x_studio_production: workorder.production_id[0], 
              x_studio_accion_a_ejecutar: action, 
              x_studio_motivo_del_bloqueo: blockReason}, user.company_id, (data: any) => {
                if(!data || !data?.status) {
                  const errorMsg = data?.message?.faultString || data?.message || "Error ejecutando acción en Odoo"
                  return resolve({status: false, message: errorMsg, faultString: errorMsg})
                }
              console.log("datos enviado:",workorder.id,workorder.production_id[0],action,blockReason,user.company_id);
              console.log("Respuesta de Odoo al crear accion remota:", data);
              return resolve({status: true, message: "Accion realizada con exito."})
            },
            false
            )
        },
        false)
    })
  } catch (error) {
    console.error("Error en la función updateOrder:", error);
    throw new Error("Hubo un error al procesar la orden.");
  }

}

