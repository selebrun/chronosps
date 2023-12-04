"use client"
import { useState } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
// UI Components

import { StatusBadge } from '@/ui/status-badge/status-badge'
import { ModalDetailWork } from '@/ui/modal-detail-work/ModalDetailWork'
import { updateOrder } from '@/app/api/updateOrder/updateOrder'
import { getWorkOrders } from '@/app/api/orders/getOrders'


export function WorkOrdersTable({ odooOrders, user }: { odooOrders: any, user: any}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalIsOpenInstructions, setModalIsOpenInstructions] = useState(false);
  const [orderProduction, setOrderProduction] = useState<any>({});
  const [showDetailOrderWork, setShowDetailOrderWork] = useState<any>({});
  const [workoOrder, setOrdersWork] = useState<any>(odooOrders);
  const [loadigAction, setLoadigAction] = useState<boolean>(false)
  const [orderSelected, setOrderSelectedk] = useState<any>({});


  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }


  const openModalInstructions = () => {
    setModalIsOpenInstructions(!modalIsOpenInstructions)
  }

  const onSaveOrderId = (order: any) => {
    setOrderSelectedk(order)
    const dateilOrden = workoOrder?.data.find((orden:any) => orden.id === parseInt(order.id))
    getDetailOrderWork(dateilOrden)
  }


  const getDetailOrderWork = (order: any) => {
    let duration_expected = ""
    let duration = ""
    let minutes = order.duration_expected
    let k = 0

    if (minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration_expected += k + "Dias "; minutes -= k*60*24
    }
    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration_expected += k + "Horas "; minutes -= k*60*24
    }
    if(minutes >= 1) duration_expected += Math.floor(minutes) + "Minutos"

    minutes = order?.duration

    if(minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration += k + "Dias "; minutes -= k*60*24
    }

    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration += k + "Horas "; minutes -= k*60*24
    }

    if(minutes >= 1) duration += Math.floor(minutes) + "Minutos"

    order.theoretical_duration = duration_expected
    order.real_duration = duration

    setShowDetailOrderWork(order)

    const dateilOrden = workoOrder?.production_data.find((orden:any) =>  orden.id === order.production_id[0])
    setOrderProduction(dateilOrden)
  }
  
  const progress = Math.floor((showDetailOrderWork?.duration / showDetailOrderWork?.duration_expected) * 100) || 0

  const executeWorkOrderAction = async (action: string) => {
    setLoadigAction(true)
    const update = await updateOrder(user, orderSelected, action).then( res => res).catch((err) => console.log(err))
    if (update.status) {
      const odooOrdersWork: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err))
      setOrdersWork(odooOrdersWork)
      setLoadigAction(false)
      setModalIsOpen(!modalIsOpen)
    } else {
      setLoadigAction(false)
    }
  }


  return (
    <>
      {modalIsOpen && 
        <ModalDetailWork
         modalIsOpenJobDetail={modalIsOpen}
         setModalIsOpenJobDetail={(close: boolean) => setModalIsOpen(close)}
         orderProductionSelected={orderProduction}
         showDetailOrderWork={showDetailOrderWork}
         progress={progress}
         modalIsOpenInstructions={modalIsOpenInstructions}
         openModalInstructions={openModalInstructions}
         executeWorkOrderAction={executeWorkOrderAction}
         loadigAction={loadigAction}
        />
      }
      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
                <tr>
                  <th scope="col" className="px-6 py-3 ">
                    No.OT
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3">
                   Producción
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Centro de trabajo
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Inicio programado
                  </th>
                  <th scope="col" className="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody>
              {workoOrder?.data.map((order: any) => (
                <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                    <th className="px-3 py-2">
                      {order.id}
                    </th>
                    <td className="px-3 py-2">
                      <StatusBadge status={order.state} />
                    </td>
                    <td className="px-3 py-2">{order.name}</td>
                    <td className="px-3 py-2">{order.production_id[1]}</td>
                    <td className="px-3 py-2">{order.workcenter_id[1]}</td>
                    <td className="px-3 py-2">{order.date_planned_start}</td>
                    <td className="px-3 py-2">
                      <button 
                      onClick={() => { 
                        openWorkOrders()
                        onSaveOrderId(order)
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
