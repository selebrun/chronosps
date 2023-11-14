"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'


export function ProductionOrdersTable({ odooOrders, ordersWork }: { odooOrders: any, ordersWork: any}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [orderWorkDetail, setOrderWorkDetail] = useState([]);


  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }

  const onSaveOrderId = (orderId: string) => {
    const dateilOrden = ordersWork?.data.filter((orden:any) => orden.production_id[0] === parseInt(orderId))
    setOrderWorkDetail(dateilOrden)
  }

  return (
    <>
      <Modal setOpen={modalIsOpen} title='Órdenes de trabajo' className='max-w-3xl'>
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
          {orderWorkDetail.length > 0 && 
            <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
                <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
                  <tr>
                    <th scope="col" className="px-3 py-3 ">
                      NO. de Orden
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Producto
                    </th>
                    <th scope="col" className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderWorkDetail.map((order: any) => (
                    <tr key={`production-order-${order.id}`} className="border-b-8 border-white bg-lightCyan text-gray-700">
                      <th scope="row" className="px-5 font-medium text-black">
                        <div className="flex items-center space-x-4 whitespace-normal">
                          <div className="dark:text-white">
                            <div className="text-sm text-black">{order.id}</div>
                          </div>
                        </div>
                      </th>
                      <td className="px-3 py-2">
                        <StatusBadge status={order.state} />
                      </td>
                      <td className="px-3 py-2">
                        {order.workcenter_id[1]}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => { 
                          openWorkOrders()
                          onSaveOrderId(order.id)
                        }}>
                          <Image
                            src={eyeDetails}
                            alt="Eye Details"
                            className='w-20 h-5'
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          {orderWorkDetail.length === 0 && 
             <h5 className="mb-2 text-2xl tracking-tight text-gray-700 dark:text-white flex justify-center">No hay órdenes de trabajo</h5>
          }
      </Modal>

      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
          <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
            <tr>
              <th scope="col" className="px-6 py-3 ">
                NO. de Orden
              </th>
              <th scope="col" className="px-6 py-3">
                Estado
              </th>
              <th scope="col" className="px-6 py-3">
                Producto
              </th>
              <th scope="col" className="px-6 py-3">
                Cantidad
              </th>
              <th scope="col" className="px-6 py-3">
                Lote
              </th>
              <th scope="col" className="px-6 py-3">
                Responsable
              </th>
              <th scope="col" className="px-6 py-3">
                Inicio programado
              </th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {odooOrders?.data?.map((order: any) => (
              <tr key={`production-order-${order.id}`} className="border-b-8 border-white bg-lightCyan text-gray-700">
                <th scope="row" className="px-5 font-medium text-black">
                  <div className="flex items-center space-x-4 whitespace-normal">
                    <div className="dark:text-white">
                      <div className="text-sm text-black">{order.name}</div>
                    </div>
                  </div>
                </th>
                <td className="px-3 py-2">
                  <StatusBadge status={order.state} />
                </td>
                <td className="px-3 py-2">
                  {order.product_id[1]}
                </td>
                <td className="px-3 py-2">
                  {order.qty_producing}/{order.product_qty}
                </td>
                <td className="px-3 py-2">
                  {order.lot_producing_id[1]}
                </td>
                <td className="px-3 py-2">
                  {order.user_id[1]}
                </td>
                <td className="px-3 py-2">
                  {order.date_planned_start}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => { 
                    openWorkOrders()
                    onSaveOrderId(order.id)
                  }}>
                    <Image
                      src={eyeDetails}
                      alt="Eye Details"
                      className='w-20 h-5'
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
