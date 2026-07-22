"use client"
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'
import ModalOrderQualityDetails from './modal-order-quality-details'

function getWorkOrderName(order: any) {
  const workorderName = order?.workorder_name || (Array.isArray(order?.workorder_id) ? order.workorder_id[1] : order?.workorder_id || '');
  const operationName = workorderName.includes(' - ') ? workorderName.split(' - ').slice(1).join(' - ') : workorderName;

  if (order?.workorder_sequence !== null && order?.workorder_sequence !== undefined) {
    return operationName ? `${order.workorder_sequence} - ${operationName}` : order.workorder_sequence;
  }

  return operationName || 'N/A';
}

function getQualityPointName(order: any) {
  const pointName = Array.isArray(order?.point_id) ? order.point_id[1] : order?.point_id;
  return pointName ? `${order.name} - ${pointName}` : order?.name || 'N/A';
}

function getMany2OneName(value: any, fallback = 'N/A') {
  if (Array.isArray(value)) return value[1] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}


export function ModalOrderQuality({ 
  selectedQualityDetails,
  orderQualityDetail, 
  modalIsOpen, 
  setModalIsOpen, 
  modalDetailsIsOpen,
  openJobDetail,
  selectedOrderQuantity,
  acceptOrder,
  rejectOrder,
  saveNotes,
  user
}: 
{ selectedQualityDetails: (order: any) => void,
  orderQualityDetail: any, 
  modalIsOpen: boolean, 
  setModalIsOpen: any, 
  modalDetailsIsOpen: boolean,
  openJobDetail: any,
  selectedOrderQuantity:any,
  acceptOrder: (observations?: string) => Promise<any>,
  rejectOrder: (observations?: string) => Promise<any>,
  saveNotes: (observations?: string) => Promise<any>,
  user: any
}) {
  return (
    <>
      {modalDetailsIsOpen && 
      <ModalOrderQualityDetails 
        modalWorkOrderDetail={modalDetailsIsOpen}
        openJobDetail={openJobDetail}
        orderQualityDetail={orderQualityDetail}
        selectedOrderQuantity={selectedOrderQuantity}
        acceptOrder={acceptOrder}
        rejectOrder={rejectOrder}
        saveNotes={saveNotes}
        user={user}
        />}
      <Modal setOpen={modalIsOpen && !modalDetailsIsOpen} title='Controles de calidad' className='max-w-3xl'>
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => setModalIsOpen(false)}
          >
            <Image
              src={close}
              alt="Close"
            />
          </button>
          </div>
          {orderQualityDetail.length > 0 && 
            <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300 relative overflow-y-auto">
                <thead className="text-xs text-black dark:text-gray-100 uppercase bg-strongCyan dark:bg-sky-900 border-b-8 border-white dark:border-gray-700 sticky top-0">
                  <tr>
                    <th scope="col" className="px-6 py-3 ">
                      {'Orden de trabajo'}
                    </th>
                    <th scope="col" className="px-6 py-3 ">
                      {'Punto de control'}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {'Estado'}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {'Producto'}
                    </th>
                    <th scope="col" className="px-6 py-3">
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderQualityDetail.map((order: any) => (
                    <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:border-gray-700 bg-lightCyan dark:bg-gray-600 text-gray-700 dark:text-gray-100">
                      <td className="px-3 py-2 text-black dark:text-gray-100">
                        {getWorkOrderName(order)}
                      </td>
                      <th scope="row" className="px-5 font-medium text-black dark:text-gray-100">
                        <div className="flex items-center space-x-4 whitespace-normal">
                          <div className="text-sm">{getQualityPointName(order)}</div>
                        </div>
                      </th>
                      <td className="px-6 py-2">
                        <StatusBadge status={order.quality_state} />
                      </td>
                      <td className="px-3 py-2">
                        {getMany2OneName(order.product_id)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            openJobDetail()
                            selectedQualityDetails(order)
                          }}
                        >
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
           }
          {orderQualityDetail.length === 0 && 
             <h5 className="mb-2 text-2xl tracking-tight text-gray-700 dark:text-white flex justify-center">No hay órdenes de trabajo</h5>
          }
      </Modal>
    </>
    
  )
}
