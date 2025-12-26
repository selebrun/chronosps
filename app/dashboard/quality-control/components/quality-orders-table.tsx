"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { ModalOrderQuality } from './modal-order-quality'
import { acceptQualityControl } from '@/app/api/accionQualityControl/accionQualityControl'


export function QualityOrdersTable({ odooOrders, user }:{ odooOrders: any, user: any }) {
  const [orderQualityDetail, setOrderQualityDetail] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalDetailsIsOpen, setModalDetailsIsOpen] = useState(false);
  const [selectedOrderQuantity, setSelectedOrderQuantity] = useState({});
  const [ordersQualityControl, setOrdersQualityControl] = useState<any[]>([]);

  useEffect(()=>{
    let orders:any[] = []
    odooOrders?.data.filter((work: any) => (
    orders =  odooOrders?.production_data.filter((pro: any) =>  pro.product_id[0] === work.product_id[0])
    ))
    setOrdersQualityControl(orders)
  }, [])


  const  openJobDetail= () => {
    setModalDetailsIsOpen(!modalDetailsIsOpen)
  }

  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }

  const onSaveOrderId = (order: any) => {
    const dateilOrden = odooOrders?.data.filter((orden:any) => orden.production_id[0] === order.id)
    setOrderQualityDetail(dateilOrden)
  }
  
  const selectedQualityDetails = (order : any) =>{
    setSelectedOrderQuantity(order)
  }

  const acceptOrder = async () => {
    const accept: any = await acceptQualityControl(user, selectedOrderQuantity).then( res => res).catch((err) => console.log(err))
  }

  return (
    <>
      <ModalOrderQuality 
        modalIsOpen={modalIsOpen} 
        orderQualityDetail={orderQualityDetail}
        setModalIsOpen={(close: boolean) => setModalIsOpen(close)}
        modalDetailsIsOpen={modalDetailsIsOpen}
        openJobDetail={()=> openJobDetail()}
        selectedQualityDetails={selectedQualityDetails}
        selectedOrderQuantity={selectedOrderQuantity}
        acceptOrder={acceptOrder}
      /> 
      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
          <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white sticky top-0">
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
            {ordersQualityControl?.map((order: any) => (
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
                <td className="px-3 py-2 overflow-y-auto">
                  <button onClick={() => { 
                    openWorkOrders()
                    onSaveOrderId(order)
                  }}>
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
        {ordersQualityControl.length  === 0 && 
              <div className='text-center w-full text-xl mt-10'>
                No se encontro ordenes
              </div>}
      </div>
    </>
  )
}
