"use client"
import { useState } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'


export function QualityOrdersTable({ odooOrders, qualityControlData }: { odooOrders: any, qualityControlData: any}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [qualityControls, setQualityControls] = useState<any[]>();
  const [qualityDetails, setQualityDetails] = useState<any>({id: null});



  const viewQualityControls = (orderId: number) => {
    const qualityCtrls = qualityControlData.filter((x:any) => x.production_id[0] == orderId) || []
    setQualityControls(qualityCtrls)
    setModalIsOpen(true)
  }

  const viewDeatails = (qualityCtrlData: any) => {
    setQualityDetails(qualityCtrlData)
  }


  return (
    <>
      <Modal setOpen={modalIsOpen} title='Controles de calidad' className='max-w-3xl'>
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => {
              setModalIsOpen(false)
              setQualityDetails({})
            }}
          >
            <Image
              src={close}
              alt="Close"
            />
          </button>
        </div>

        {!qualityDetails.id ? (
        <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white ">
                <tr>
                <th scope="col" className="px-3 py-3 ">
                    ID
                </th>
                <th scope="col" className="px-3 py-3">
                    PT
                </th>
                <th scope="col" className="px-3 py-3">
                    ESTADO
                </th>
                <th scope="col" className="px-3 py-3">
                    VER
                </th>
                </tr>
            </thead>
            <tbody>
                {qualityControls?.map((qualityData: any) => (
                <tr key={`quality-${qualityData.id}`} className="border-b-8 border-white bg-lightCyan text-gray-700">
                    <th scope="row" className="px-5 font-medium text-black">
                    <div className="flex items-center space-x-4 whitespace-normal">
                        <div className="dark:text-white">
                        <div className="text-sm text-black">{qualityData.id}</div>
                        </div>
                    </div>
                    </th>
                    <td className="px-3 py-2">
                    {qualityData.name}
                    </td>
                    <td className="px-3 py-2">
                    
                    </td>
                    <td className="px-3 py-2">
                    <button 
                    onClick={() => viewDeatails(qualityData)}
                    >
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
        ) : (
          <p>{JSON.stringify(qualityDetails, null, 2)}</p>
        )}

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
                  {order.product_id?.[1]}
                </td>
                <td className="px-3 py-2">
                  {order.qty_producing}/{order.product_qty}
                </td>
                <td className="px-3 py-2">
                  {order.lot_producing_id?.[1]}
                </td>
                <td className="px-3 py-2">
                  {order.user_id?.[1]}
                </td>
                <td className="px-3 py-2">
                  {order.date_planned_start}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => { 
                    viewQualityControls(order.id)
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
