'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { config } from '@/auth'
import { getOdooData, setOdooData } from '@/app/api/odoo/odooService'

const WORK_ORDER_ASSIGNMENT_ROLES = new Set(['admin', 'administrador', 'chronosadmin', 'lider', 'jefe'])
const PRODUCTION_ASSIGNMENT_ROLES = new Set(['admin', 'administrador', 'chronosadmin', 'jefe'])

function normalizeRole(value: any) {
  return String(value || '').trim().toLowerCase()
}

function getOdooError(response: any, fallback: string) {
  return response?.message?.faultString || response?.message?.message || response?.message || fallback
}

function readOdooRecords(model: string, domain: any[], fields: string[], companyId: string, order = 'name asc'): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(model, domain, fields, false, order, companyId, (response: any) => resolve(response), false)
  })
}

function writeOdooRecord(model: string, ids: number[], values: any, companyId: string): Promise<any> {
  return new Promise((resolve) => {
    setOdooData(model, ids, values, companyId, (response: any) => resolve(response))
  })
}

async function getAssignmentActor() {
  const session = await getServerSession(config)
  const user: any = session?.user
  const companyId = String(user?.company_id || '').trim()
  const role = normalizeRole(user?.role)

  if (!user || !companyId || !role) {
    return { status: false, message: 'No autorizado.' }
  }

  return { status: true, user, companyId, role }
}

export async function getOrderAssignmentOptions() {
  const actor: any = await getAssignmentActor()
  if (!actor.status) {
    return { status: false, message: actor.message, employees: [], responsibleUsers: [] }
  }

  const canAssignWorkOrder = WORK_ORDER_ASSIGNMENT_ROLES.has(actor.role)
  const canAssignProduction = PRODUCTION_ASSIGNMENT_ROLES.has(actor.role)
  if (!canAssignWorkOrder && !canAssignProduction) {
    return { status: true, employees: [], responsibleUsers: [] }
  }

  const [employeesResponse, usersResponse] = await Promise.all([
    canAssignWorkOrder
      ? readOdooRecords('hr.employee', [['active', '=', true]], ['id', 'name', 'identification_id', 'user_id'], actor.companyId)
      : Promise.resolve({ status: true, data: [] }),
    canAssignProduction
      ? readOdooRecords('res.users', [['active', '=', true]], ['id', 'name', 'login', 'share'], actor.companyId)
      : Promise.resolve({ status: true, data: [] }),
  ])

  if (!employeesResponse?.status || !usersResponse?.status) {
    return {
      status: false,
      message: getOdooError(
        !employeesResponse?.status ? employeesResponse : usersResponse,
        'No se pudieron consultar las opciones de asignacion en Odoo.'
      ),
      employees: [],
      responsibleUsers: [],
    }
  }

  const employees = (Array.isArray(employeesResponse.data) ? employeesResponse.data : [])
    .map((employee: any) => ({
      id: Number(employee?.id),
      name: String(employee?.name || '').trim(),
      identification_id: String(employee?.identification_id || '').trim(),
    }))
    .filter((employee: any) => employee.id && employee.name)

  const responsibleUsers = (Array.isArray(usersResponse.data) ? usersResponse.data : [])
    .filter((odooUser: any) => odooUser?.share !== true)
    .map((odooUser: any) => ({
      id: Number(odooUser?.id),
      name: String(odooUser?.name || odooUser?.login || '').trim(),
      login: String(odooUser?.login || '').trim(),
    }))
    .filter((odooUser: any) => odooUser.id && odooUser.name)

  return { status: true, employees, responsibleUsers }
}

export async function assignWorkOrderOperator(workOrderIdValue: any, employeeIdValue: any) {
  const actor: any = await getAssignmentActor()
  if (!actor.status || !WORK_ORDER_ASSIGNMENT_ROLES.has(actor.role)) {
    return { status: false, message: 'Su perfil no puede asignar operadores a ordenes de trabajo.' }
  }

  const workOrderId = Number(workOrderIdValue)
  const employeeId = Number(employeeIdValue) || 0
  if (!workOrderId) return { status: false, message: 'La orden de trabajo no es valida.' }

  const workOrderResponse = await readOdooRecords('mrp.workorder', [['id', '=', workOrderId]], ['id'], actor.companyId, 'id asc')
  if (!workOrderResponse?.status || !workOrderResponse?.data?.length) {
    return { status: false, message: 'La orden de trabajo no existe o no pertenece a esta empresa.' }
  }

  let employee: any = null
  if (employeeId) {
    const employeeResponse = await readOdooRecords(
      'hr.employee',
      [['id', '=', employeeId], ['active', '=', true]],
      ['id', 'name', 'identification_id'],
      actor.companyId,
      'id asc'
    )
    employee = employeeResponse?.status ? employeeResponse?.data?.[0] : null
    if (!employee) return { status: false, message: 'El operador seleccionado no esta disponible en Odoo.' }
  }

  const response = await writeOdooRecord(
    'mrp.workorder',
    [workOrderId],
    { employee_assigned_ids: [[6, 0, employeeId ? [employeeId] : []]] },
    actor.companyId
  )
  if (!response?.status) {
    return { status: false, message: getOdooError(response, 'No se pudo asignar el operador en Odoo.') }
  }

  revalidatePath('/dashboard/work-orders')
  revalidatePath('/dashboard/production-orders')
  return {
    status: true,
    message: employeeId ? 'Operador asignado correctamente.' : 'La OT quedo sin operador asignado.',
    employee: employeeId ? { id: employeeId, name: employee?.name || `Empleado ${employeeId}` } : null,
  }
}

export async function assignProductionResponsible(productionIdValue: any, responsibleUserIdValue: any) {
  const actor: any = await getAssignmentActor()
  if (!actor.status || !PRODUCTION_ASSIGNMENT_ROLES.has(actor.role)) {
    return { status: false, message: 'Su perfil no puede asignar responsables a ordenes de produccion.' }
  }

  const productionId = Number(productionIdValue)
  const responsibleUserId = Number(responsibleUserIdValue) || 0
  if (!productionId) return { status: false, message: 'La orden de produccion no es valida.' }

  const productionResponse = await readOdooRecords('mrp.production', [['id', '=', productionId]], ['id'], actor.companyId, 'id asc')
  if (!productionResponse?.status || !productionResponse?.data?.length) {
    return { status: false, message: 'La orden de produccion no existe o no pertenece a esta empresa.' }
  }

  let responsibleUser: any = null
  if (responsibleUserId) {
    const userResponse = await readOdooRecords(
      'res.users',
      [['id', '=', responsibleUserId], ['active', '=', true]],
      ['id', 'name', 'login', 'share'],
      actor.companyId,
      'id asc'
    )
    responsibleUser = userResponse?.status ? userResponse?.data?.[0] : null
    if (!responsibleUser || responsibleUser?.share === true) {
      return { status: false, message: 'El responsable seleccionado no es un usuario interno disponible en Odoo.' }
    }
  }

  const response = await writeOdooRecord(
    'mrp.production',
    [productionId],
    { user_id: responsibleUserId || false },
    actor.companyId
  )
  if (!response?.status) {
    return { status: false, message: getOdooError(response, 'No se pudo asignar el responsable en Odoo.') }
  }

  revalidatePath('/dashboard/production-orders')
  return {
    status: true,
    message: responsibleUserId ? 'Responsable asignado correctamente.' : 'La OP quedo sin responsable asignado.',
    responsibleUser: responsibleUserId
      ? { id: responsibleUserId, name: responsibleUser?.name || responsibleUser?.login || `Usuario ${responsibleUserId}` }
      : null,
  }
}
