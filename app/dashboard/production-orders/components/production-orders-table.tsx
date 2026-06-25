"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { getStatusLabel, StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'
import { OrderTableModalWork } from '@/ui/format-table/orderTableModalWork'
import { ModalDetailWork } from '@/ui/modal-detail-work/ModalDetailWork'
import { StatusHelpButton } from '@/ui/status-help-button/StatusHelpButton'
import { updateOrder } from '@/app/api/updateOrder/updateOrder'
import { getWorkOrders } from '@/app/api/orders/getOrders'
import { getMaterialsOrder, saveMaterialsOrder } from '@/app/api/getMaterialsOrder/getMaterialsOrder'

function normalizeSearchText(value: any) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function productionMatchesSearch(order: any, term: string) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return true;

  const searchableText = [
    order?.name,
    order?.state,
    getStatusLabel(order?.state),
    order?.product_id?.[1],
    order?.origin,
    order?.x_studio_po,
    order?.lot_producing_id?.[1],
    order?.user_id?.[1],
    order?.date_planned_start,
  ].map(normalizeSearchText).join(' ');

  return searchableText.includes(normalizedTerm);
}

function getWorkOrderProgress(workOrder: any) {
  const realSeconds = Number(workOrder?.piso_real_duration_seconds);
  const expectedSeconds = Number(workOrder?.piso_expected_duration_seconds);

  if (Number.isFinite(realSeconds) && Number.isFinite(expectedSeconds) && expectedSeconds > 0) {
    return Math.min(Math.max(Math.floor((realSeconds / expectedSeconds) * 100), 0), 100);
  }

  const duration = Number(workOrder?.duration);
  const expectedDuration = Number(workOrder?.duration_expected);
  if (!Number.isFinite(duration) || !Number.isFinite(expectedDuration) || expectedDuration <= 0) return 0;
  return Math.min(Math.max(Math.floor((duration / expectedDuration) * 100), 0), 100);
}

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
  const [error, setError] = useState<string>('');
  const [qualityPauseMessage, setQualityPauseMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(()=>{
    if(!user.materiales) {
      setDisabledBtnSaveMaterial(true)
    }
  }, [user?.materiales])

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
      k = Math.floor(minutes/60); duration_expected += k + "Horas "; minutes -= k*60
    }
    if(minutes >= 1) duration_expected += Math.floor(minutes) + "Minutos"

    minutes = dateilOrden?.duration

    if(minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration += k + "Dias "; minutes -= k*60*24
    }

    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration += k + "Horas "; minutes -= k*60
    }

    if(minutes >= 1) duration += Math.floor(minutes) + "Minutos"

    dateilOrden.theoretical_duration = duration_expected
    dateilOrden.real_duration = duration
    setShowDetailOrderWork(dateilOrden)
  }

  const onSaveOrderId = (order: any) => {
    const dateilOrden = workoOrder?.data
      .filter((orden:any) => orden.production_id[0] === parseInt(order.id))
      .sort((a: any, b: any) => {
        const sequenceA = Number(a.sequence ?? a.x_studio_nro_ot ?? 0);
        const sequenceB = Number(b.sequence ?? b.x_studio_nro_ot ?? 0);
        if (sequenceA !== sequenceB) return sequenceA - sequenceB;
        return String(a.name || '').localeCompare(String(b.name || ''), 'es', { numeric: true });
      })
    setOrderWorkDetail(dateilOrden)
    setOrderProductionSelected(order)
  }
  
  const openModalInstructions = () => {
    setModalIsOpenInstructions(!modalIsOpenInstructions)
  }

  const isQualityControlError = (message: string) => {
    const normalizedMessage = (message || '').toLowerCase();
    return normalizedMessage.includes('calidad') || normalizedMessage.includes('quality');
  }

  const getQualityPauseMessage = (message: string) => {
    return `${message.replace('usando el taller', 'usando el módulo de calidad')} La orden de trabajo fue pausada para realizar los controles de calidad.`
  }

  const executeWorkOrderAction = async (action: string, block_reason?: any | undefined, qtyDone?: number | undefined ) => {
    const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected;

    if (['start_work_order', 'finish_work_order'].includes(action) && user?.role === 'Operario' && currentWorkOrder?.quality_failed) {
      setError('Esta orden de trabajo tiene un control de calidad fallado. Un Lider o Calidad debe revisar antes de continuar.')
      return
    }

    // Validation for start action
    if (action === 'start_work_order') {
      // Check if operator is assigned
      if (!currentWorkOrder?.employee_assigned_ids || currentWorkOrder?.employee_assigned_ids.length === 0) {
        setError('No hay operario asignado a esta orden de trabajo. Asigne un operario antes de iniciar.')
        return
      }
      
      // Validate materials exist (basic check - Odoo will do detailed validation)
      if (!orderProductionSelected.move_raw_ids || orderProductionSelected.move_raw_ids.length === 0) {
        setError('No hay materiales definidos para esta orden de producción. Defina los materiales en la BOM antes de iniciar.')
        return
      }
    }

    setLoadigAction(true)
    setModalIsOpenBlocks(false)
    const update = await updateOrder(user, currentWorkOrder, action, block_reason, qtyDone).then( res => res).catch((err) => console.log(err))
    if (update?.status) {
      const odooOrdersWork: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err))
      const dateilOrden = odooOrdersWork?.data.filter((orden:any) => orden.production_id[0] === parseInt(orderProductionSelected.id))

      let orderWorkSelected1 = currentWorkOrder;
      const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === currentWorkOrder.id)
      if (action === 'finish_work_order') {
        orderWorkSelected1 = refreshedOrder || {...currentWorkOrder, state: 'completed', is_user_working: false, working_state: 'done', piso_active_elapsed_seconds: 0}
      } else {
        orderWorkSelected1 = refreshedOrder || currentWorkOrder
      }

      seOrderWorkSelected(orderWorkSelected1)
      setShowDetailOrderWork(orderWorkSelected1)
      setOrderWorkDetail(dateilOrden)
      setOrdersWork(odooOrdersWork)
      setLoadigAction(false)
    } else {
      const message = update?.faultString || update?.message || 'No se pudo ejecutar la accion.'
      if (action === 'finish_work_order' && isQualityControlError(message)) {
        const odooOrdersWork: any = await getWorkOrders(user).then(res => res).catch((err) => console.log(err))
        const dateilOrden = odooOrdersWork?.data?.filter((orden:any) => orden.production_id[0] === parseInt(orderProductionSelected.id))
        const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === currentWorkOrder.id)
        if (refreshedOrder) {
          seOrderWorkSelected(refreshedOrder)
          setShowDetailOrderWork(refreshedOrder)
        }
        if (dateilOrden) setOrderWorkDetail(dateilOrden)
        if (odooOrdersWork?.data) setOrdersWork(odooOrdersWork)
        setQualityPauseMessage(update?.qualityPause ? message : getQualityPauseMessage(message))
        setLoadigAction(false)
        return
      }

      setError(message)
      setLoadigAction(false)
    }
  }

  const getMaterials = async () => {
    setMaterials([])
    const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected;
    const materials = await getMaterialsOrder(user, orderProductionSelected.move_raw_ids, currentWorkOrder).then( res => res).catch((err) => console.log(err))
    if(materials?.status) {
      setMaterials(materials.data)
    }
  }

  const onAddMaterial = async (material: any, total: number) => { 
    const objeto = { material: material }; 
    const materialSelected = materials.find((material: any) => material.id === parseInt(objeto.material))
    materialSelected.additional_quantity = Number(total)
    setOrderMaterialsSelected(materialSelected)
    setDisabledBtnSaveMaterial(false)
  }

  const onSaveMaterialsOrder = async () => {
    setLoadigSaveMaterials(true)
    try {
      const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected;
      const data = await saveMaterialsOrder(
        user,
        currentWorkOrder.id,
        orderProductionSelected.id,
        orderMaterialsSelected.product_id[0],
        orderMaterialsSelected.product_uom[0],
        orderMaterialsSelected.additional_quantity,
        orderMaterialsSelected.location_id[0],
        orderMaterialsSelected.location_dest_id[0],
        orderMaterialsSelected.company_id[0],
        orderMaterialsSelected.product_id[1],
        orderMaterialsSelected.operation_id?.[0]
      )

      if (data?.status) {
        setDisabledBtnSaveMaterial(true)
        setModalIsMaterials(false)
        setOrderMaterialsSelected({})
      } else {
        setError(data?.message || 'No se pudo agregar el material.')
      }
    } catch (error: any) {
      setError(error?.message || 'No se pudo agregar el material.')
    } finally {
      setLoadigSaveMaterials(false)
    }
  }

  const progress = getWorkOrderProgress(showDetailOrderWork);
  const productionIdsWithWorkOrders = new Set(
    (workoOrder?.data || []).map((workOrder: any) => Number(workOrder?.production_id?.[0])).filter(Boolean)
  );
  const productionOrders = [...(odooOrders?.data || [])].sort((a: any, b: any) => {
    const nameOrder = String(a.name || '').localeCompare(String(b.name || ''), 'es', { numeric: true });
    if (nameOrder !== 0) return nameOrder;
    const dateA = String(a.date_planned_start || '');
    const dateB = String(b.date_planned_start || '');
    return dateA.localeCompare(dateB);
  }).filter((order: any) =>
    ((Array.isArray(order?.workorder_ids) && order.workorder_ids.length > 0) ||
    productionIdsWithWorkOrders.has(Number(order.id))) &&
    productionMatchesSearch(order, searchTerm)
  );


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
           thOrder={'No. OT'} 
           thStatus={'Estado'} 
           thProduct={'Centro de Trabajo'}
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
         error={error}
         onCloseError={() => setError('')}
         qualityPauseMessage={qualityPauseMessage}
         onCloseQualityPauseMessage={() => setQualityPauseMessage('')}
        />
      }
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por OP, producto, origen, lote, responsable o estado"
          className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 p-3 text-sm text-gray-900 shadow-sm focus:border-sky-950 dark:focus:border-sky-400 focus:outline-none"
        />
        <StatusHelpButton module="production" />
      </div>
      <div className="relative max-h-[calc(100vh-13.5rem)] min-h-[calc(100vh-13.5rem)] max-w-full overflow-x-auto overflow-y-auto rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300 relative overflow-y-auto">
          <thead className="text-xs text-black dark:text-gray-100 uppercase bg-strongCyan dark:bg-sky-900 border-b-8 border-white dark:border-gray-800 sticky top-0">
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
            {productionOrders.map((order: any) => (
              <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:border-gray-800 bg-lightCyan dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                <th scope="row" className="px-5 font-medium text-black dark:text-gray-100">
                  <div className="flex items-center space-x-4 whitespace-normal">
                    <div>
                      <div className="text-sm text-black dark:text-gray-100">{order.name}</div>
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
                 {order?.x_studio_po || order?.origin }
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
