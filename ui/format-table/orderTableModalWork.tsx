import { StatusBadge } from '@/ui/status-badge/status-badge'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'

function getWorkOrderDisplayStatus(order: any) {
  if (order?.quality_failed) return 'quality_failed';
  if (order?.local_blocked) return 'blocked';
  if (order?.working_state === 'paused') return 'paused';
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

export const OrderTableModalWork = ({ orderDetail, thOrder, thStatus, thProduct, openJobDetail }: {
    orderDetail: any,
    thOrder: string,
    thStatus: string,
    thProduct: string,
    openJobDetail: (order: any) => void
  }) => {

  return (
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
  )
}
