import { StatusBadge } from '@/ui/status-badge/status-badge'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'

function getWorkOrderDisplayStatus(order: any) {
  if (order?.local_blocked) return 'blocked';
  if (order?.quality_failed) return 'quality_failed';
  if (order?.quality_pending) return 'quality_pending';
  if (order?.working_state === 'paused') return 'paused';
  if (order?.is_user_working || order?.working_state === 'progress') return 'progress';
  return order?.state;
}

function getWorkOrderNumber(order: any) {
  return order?.sequence ?? order?.x_studio_nro_ot ?? order?.id ?? '';
}

function getOdooName(value: any, fallback = 'N/A') {
  if (Array.isArray(value)) return value[1] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

export const OrderTableModalWork = ({
    orderDetail,
    thOrder,
    thStatus,
    thProduct,
    openJobDetail,
    canAssignOperator = false,
    employeeOptions = [],
    assignmentLoadingId = null,
    onAssignOperator,
    assignmentMessage,
    onCloseAssignmentMessage,
  }: {
    orderDetail: any,
    thOrder: string,
    thStatus: string,
    thProduct: string,
    openJobDetail: (order: any) => void,
    canAssignOperator?: boolean,
    employeeOptions?: any[],
    assignmentLoadingId?: number | null,
    onAssignOperator?: (order: any, employeeId: string) => void | Promise<void>,
    assignmentMessage?: { type: 'success' | 'error', text: string } | null,
    onCloseAssignmentMessage?: () => void,
  }) => {

  const getAssignedOperatorId = (order: any) => {
    const assignedIds = Array.isArray(order?.employee_assigned_ids) ? order.employee_assigned_ids : []
    return Number(assignedIds[0]) || 0
  }

  const getAssignedOperatorName = (order: any) => {
    const employeeId = getAssignedOperatorId(order)
    if (!employeeId) return 'Sin operador'
    return employeeOptions.find((employee: any) => Number(employee?.id) === employeeId)?.name || `Empleado ${employeeId}`
  }

  return (
    <>
    {assignmentMessage && (
      <div
        role="alert"
        className={`mb-3 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${assignmentMessage.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}
      >
        <span>{assignmentMessage.text}</span>
        <button type="button" onClick={onCloseAssignmentMessage} className="ml-4 font-bold" aria-label="Cerrar mensaje">X</button>
      </div>
    )}
    <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300 relative overflow-y-auto">
      <thead className="text-xs text-black dark:text-gray-100 uppercase bg-strongCyan dark:bg-sky-900 border-b-8 border-white dark:border-gray-700 sticky top-0">
        <tr>
          <th scope="col" className="px-3 py-3">
           {thOrder}
          </th>
          <th scope="col" className="px-3 py-3">
            {thStatus}
          </th>
          <th scope="col" className="px-3 py-3">
            {thProduct}
          </th>
          <th scope="col" className="px-3 py-3">
            Operador
          </th>
          <th scope="col" className="px-3 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {orderDetail?.map((order: any) => (
          <tr key={`production-order-${order?.id}`} className="border-b-8 border-white dark:border-gray-700 bg-lightCyan dark:bg-gray-600 text-gray-700 dark:text-gray-100">
            <th scope="row" className="px-5 font-medium text-black dark:text-gray-100">
              <div className="flex items-center space-x-4 whitespace-normal">
                <div className="text-sm">{getWorkOrderNumber(order)}</div>
              </div>
            </th>
            <td className="px-3 py-2">
              <StatusBadge status={getWorkOrderDisplayStatus(order)} />
            </td>
            <td className="px-3 py-2">
              {getOdooName(order?.workcenter_id, 'Sin centro de trabajo')}
            </td>
            <td className="min-w-[220px] px-3 py-2">
              {canAssignOperator ? (
                <select
                  aria-label={`Asignar operador a OT ${getWorkOrderNumber(order)}`}
                  value={getAssignedOperatorId(order)}
                  disabled={assignmentLoadingId === Number(order?.id)}
                  onChange={(event) => void onAssignOperator?.(order, event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 disabled:cursor-wait disabled:opacity-60 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value={0}>Sin operador</option>
                  {employeeOptions.map((employee: any) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}{employee.identification_id ? ` (${employee.identification_id})` : ''}
                    </option>
                  ))}
                </select>
              ) : getAssignedOperatorName(order)}
            </td>
            <td className="py-2">
              <button onClick={() => openJobDetail(order)}>
                <Image
                  src={eyeDetails}
                  alt="Eye Details"
                  className='h-5'
                />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  </>
  )
}
