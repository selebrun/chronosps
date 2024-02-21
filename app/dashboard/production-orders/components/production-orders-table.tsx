"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'
import { OrderTableModalWork } from '@/ui/format-table/orderTableModalWork'
import { ModalDetailWork } from '@/ui/modal-detail-work/ModalDetailWork'
import { updateOrder } from '@/app/api/updateOrder/updateOrder'
import { getWorkOrders } from '@/app/api/orders/getOrders'
import { getMaterialsOrder, saveMaterialsOrder } from '@/app/api/getMaterialsOrder/getMaterialsOrder'



export function ProductionOrdersTable({ odooOrders, ordersWork, user, blockReasons }: { odooOrders: any, ordersWork: any, user: any, blockReasons: any}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalIsOpenJobDetail, setModalIsOpenJobDetail] = useState(false);
  const [orderWorkDetail, setOrderWorkDetail] = useState<any>([]);
  const [orderProductionSelected, setOrderProductionSelected] = useState<any>({});
  const [showDetailOrderWork, setShowDetailOrderWork] = useState<any>({});
  const [modalIsOpenInstructions, setModalIsOpenInstructions] = useState(false);
  const [workoOrder, setOrdersWork] = useState<any>(ordersWork);
  const [loadigAction, setLoadigAction] = useState<boolean>(false)
  const [modalIsOpenBlocks, setModalIsOpenBlocks] = useState(false);
  const [modalIsOpenCompleteOrder, setModalIsOpenCompleteOrder] = useState(false);
  const [modalIsMaterials, setModalIsMaterials] = useState(false);
  const [materials, setMaterials] = useState<any>([]);
  const [modalIsAddMaterials, setModalIsAddMaterials] = useState(false);
  const [orderWorkSelected, seOrderWorkSelected] = useState<any>({});
  const [loadigSaveMaterials, setLoadigSaveMaterials] = useState(false);
  const [orderMaterialsSelected, setOrderMaterialsSelected] = useState<any>({});
  const [disabledBtnSaveMaterial, setDisabledBtnSaveMaterial] = useState(true);
  
  useEffect(()=>{
    if(!user.materiales) {
      setDisabledBtnSaveMaterial(true)
    }
  }, [])

  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }

  const openJobDetail = (orderId: any) => {
    seOrderWorkSelected(orderId)
    setModalIsOpenJobDetail(!modalIsOpenJobDetail)
    getDetailOrderWork(orderId.id)
  }

  const getDetailOrderWork = (orderId: string) => {
    const dateilOrden = workoOrder?.data.find((orden:any) => orden.id === parseInt(orderId))
    let duration_expected = ""
    let duration = ""
    let minutes = dateilOrden?.duration_expected
    let k = 0

    if (minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration_expected += k + "Dias "; minutes -= k*60*24
    }
    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration_expected += k + "Horas "; minutes -= k*60*24
    }
    if(minutes >= 1) duration_expected += Math.floor(minutes) + "Minutos"

    minutes = dateilOrden?.duration

    if(minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration += k + "Dias "; minutes -= k*60*24
    }

    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration += k + "Horas "; minutes -= k*60*24
    }

    if(minutes >= 1) duration += Math.floor(minutes) + "Minutos"

    dateilOrden.theoretical_duration = duration_expected
    dateilOrden.real_duration = duration
    setShowDetailOrderWork(dateilOrden)
  }

  const onSaveOrderId = (order: any) => {
    const dateilOrden = workoOrder?.data.filter((orden:any) => orden.production_id[0] === parseInt(order.id))
    setOrderWorkDetail(dateilOrden)
    setOrderProductionSelected(order)
  }
  
  const openModalInstructions = () => {
    setModalIsOpenInstructions(!modalIsOpenInstructions)
  }


  const executeWorkOrderAction = async (action: string, block_reason?: any | undefined, qtyDone?: number | undefined ) => {
    setLoadigAction(true)
    setModalIsOpenBlocks(false)
    const update = await updateOrder(user, orderWorkDetail[0], action, block_reason, qtyDone).then( res => res).catch((err) => console.log(err))

    if (update?.status) {
      const odooOrdersWork: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err))
      const dateilOrden = odooOrdersWork?.data.filter((orden:any) => orden.production_id[0] === parseInt(orderProductionSelected.id))

      let orderWorkSelected1 = orderWorkSelected;
      if (action === 'finish_work_order') {
        orderWorkSelected1 = {...orderWorkSelected, state: 'completed'}
      } else {
        orderWorkSelected1 = odooOrdersWork.data.find((item: any) => item.id === orderWorkSelected.id)
      }

      setShowDetailOrderWork(orderWorkSelected1)
      setOrderWorkDetail(dateilOrden)
      setOrdersWork(odooOrdersWork)
      setLoadigAction(false)
    } else {
      setLoadigAction(false)
    }
  }

  const getMaterials = async () => {
    setMaterials([])
    const materials = await getMaterialsOrder(user, orderProductionSelected.move_raw_ids).then( res => res).catch((err) => console.log(err))
    if(materials?.status) {
      setMaterials(materials.data)
    }
  }

  const onAddMaterial = async (material: any, total: number) => { 
    const objeto = { material: material }; 
    const materialSelected = materials.find((material: any) => material.id === parseInt(objeto.material))
    materialSelected.product_uom_qty = total
    materialSelected.quantity_done = total
    setOrderMaterialsSelected(materialSelected)
    setDisabledBtnSaveMaterial(false)
  }

  const onSaveMaterialsOrder = async () => {
    setLoadigSaveMaterials(true)
    const data = await saveMaterialsOrder(user, orderWorkSelected.id, orderProductionSelected.id, orderMaterialsSelected.product_id[0], orderMaterialsSelected.product_uom[0], orderMaterialsSelected.quantity_done, materials)

    if (data?.status) {
      setLoadigSaveMaterials(false)
    } else {
      setLoadigSaveMaterials(false)
    }
    setDisabledBtnSaveMaterial(true)
    setModalIsMaterials(false)
    setOrderMaterialsSelected({})
  }

  const progress = Math.floor((showDetailOrderWork?.duration / showDetailOrderWork?.duration_expected) * 100);


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
           <OrderTableModalWork 
           orderDetail={orderWorkDetail} 
           thOrder={'NO. de Orden'} 
           thStatus={'Estado'} 
           thProduct={'Producto'}
           openJobDetail={openJobDetail}
           />}
          {orderWorkDetail.length === 0 && 
             <h5 className="mb-2 text-2xl tracking-tight text-gray-700 dark:text-white flex justify-center">No hay órdenes de trabajo</h5>
          }
      </Modal>
      {modalIsOpenJobDetail && 
        <ModalDetailWork
         modalIsOpenJobDetail={modalIsOpenJobDetail}
         setModalIsOpenJobDetail={(close: any) => setModalIsOpenJobDetail(close)}
         orderProductionSelected={orderProductionSelected}
         showDetailOrderWork={showDetailOrderWork}
         progress={progress}
         modalIsOpenInstructions={modalIsOpenInstructions}
         openModalInstructions={openModalInstructions}
         executeWorkOrderAction={executeWorkOrderAction}
         loadigAction={loadigAction}
         modalIsOpenBlocks={modalIsOpenBlocks}
         setModalIsOpenBlocks={setModalIsOpenBlocks}
         modalIsOpenCompleteOrder={modalIsOpenCompleteOrder}
         setModalIsOpenCompleteOrder={setModalIsOpenCompleteOrder}
         blockReasons={blockReasons}
         modalIsMaterials={modalIsMaterials}
         setModalIsMaterials={setModalIsMaterials}
         modalIsAddMaterials={modalIsAddMaterials}
         setModalIsAddMaterials={setModalIsAddMaterials}
         getMaterials={getMaterials}
         materials={materials}
         onAddMaterial={onAddMaterial}
         loadigSaveMaterials={loadigSaveMaterials}
         onSaveMaterialsOrder={onSaveMaterialsOrder}
         disabledBtnSaveMaterial={disabledBtnSaveMaterial}
         setDisabledBtnSaveMaterial={setDisabledBtnSaveMaterial}
         user={user}
        />
      }
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
                PO/Origen
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
                 {order?.x_studio_po}
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
      </div>
    </>
  )
}
