"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
// UI Components

import { StatusBadge } from '@/ui/status-badge/status-badge'
import { ModalDetailWork } from '@/ui/modal-detail-work/ModalDetailWork'
import { updateOrder } from '@/app/api/updateOrder/updateOrder'
import { getWorkOrders } from '@/app/api/orders/getOrders'
import { getMaterialsOrder, saveMaterialsOrder } from '@/app/api/getMaterialsOrder/getMaterialsOrder'

function getWorkOrderDisplayStatus(order: any) {
  if (order?.quality_failed) return 'quality_failed';
  if (order?.local_blocked) return 'blocked';
  if (order?.working_state === 'paused') return 'paused';
  return order?.state;
}

function getOdooName(value: any) {
  return Array.isArray(value) ? value[1] : value || '';
}

function getOdooId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function getWorkOrderNumber(order: any) {
  return Number(order?.sequence ?? order?.x_studio_nro_ot ?? order?.id) || 0;
}

function sortWorkOrdersByProductionAndSequence(workOrders: any[] = []) {
  return [...workOrders].sort((a: any, b: any) => {
    const productionNameA = getOdooName(a?.production_id);
    const productionNameB = getOdooName(b?.production_id);
    const productionOrder = productionNameA.localeCompare(productionNameB, 'es', { numeric: true });
    if (productionOrder !== 0) return productionOrder;

    const productionIdOrder = (Number(getOdooId(a?.production_id)) || 0) - (Number(getOdooId(b?.production_id)) || 0);
    if (productionIdOrder !== 0) return productionIdOrder;

    const workOrderNumberOrder = getWorkOrderNumber(a) - getWorkOrderNumber(b);
    if (workOrderNumberOrder !== 0) return workOrderNumberOrder;

    return String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { numeric: true });
  });
}

function normalizeSearchText(value: any) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function workOrderMatchesSearch(order: any, term: string) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return true;

  const searchableText = [
    order?.sequence,
    order?.x_studio_nro_ot,
    order?.name,
    getOdooName(order?.production_id),
    getOdooName(order?.workcenter_id),
    order?.date_planned_start,
    order?.state,
    order?.working_state,
  ].map(normalizeSearchText).join(' ');

  return searchableText.includes(normalizedTerm);
}

export function WorkOrdersTable({ odooOrders, user, blockReasons }: { odooOrders: any, user: any, blockReasons: any}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalIsOpenInstructions, setModalIsOpenInstructions] = useState(false);
  const [orderProduction, setOrderProduction] = useState<any>({});
  const [showDetailOrderWork, setShowDetailOrderWork] = useState<any>({});
  const [workoOrder, setOrdersWork] = useState<any>(odooOrders);
  const [loadigAction, setLoadigAction] = useState<boolean>(false)
  const [orderSelected, setOrderSelected] = useState<any>({});
  const [modalIsOpenBlocks, setModalIsOpenBlocks] = useState(false);
  const [modalIsOpenCompleteOrder, setModalIsOpenCompleteOrder] = useState(false);
  const [modalIsMaterials, setModalIsMaterials] = useState(false);
  const [materials, setMaterials] = useState<any>([]);
  const [modalIsAddMaterials, setModalIsAddMaterials] = useState(false);
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


  const openModalInstructions = () => {
    setModalIsOpenInstructions(!modalIsOpenInstructions)
  }

  const onSaveOrderId = (order: any) => {
    setOrderSelected(order)
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
      k = Math.floor(minutes/60); duration_expected += k + "Horas "; minutes -= k*60
    }
    if(minutes >= 1) duration_expected += Math.floor(minutes) + "Minutos"

    minutes = order?.duration

    if(minutes >= 60*24) {
      k = Math.floor(minutes/(60*24)); duration += k + "Dias "; minutes -= k*60*24
    }

    if(minutes >= 60) {
      k = Math.floor(minutes/60); duration += k + "Horas "; minutes -= k*60
    }

    if(minutes >= 1) duration += Math.floor(minutes) + "Minutos"

    order.theoretical_duration = duration_expected
    order.real_duration = duration

    setShowDetailOrderWork(order)

    const dateilOrden = workoOrder?.production_data.find((orden:any) =>  orden.id === order.production_id[0])
    setOrderProduction(dateilOrden)
  }
  
  const progress = Math.floor((showDetailOrderWork?.duration / showDetailOrderWork?.duration_expected) * 100) || 0
  const orderedWorkOrders = sortWorkOrdersByProductionAndSequence(workoOrder?.data || []).filter((order: any) => workOrderMatchesSearch(order, searchTerm))

  const isQualityControlError = (message: string) => {
    const normalizedMessage = (message || '').toLowerCase();
    return normalizedMessage.includes('calidad') || normalizedMessage.includes('quality');
  }

  const getQualityPauseMessage = (message: string) => {
    return `${message.replace('usando el taller', 'usando el módulo de calidad')} La orden de trabajo fue pausada para realizar los controles de calidad.`
  }

  const executeWorkOrderAction = async (action: string, block_reason?: any | undefined, qtyDone?: number | undefined ) => {
    if (['start_work_order', 'finish_work_order'].includes(action) && user?.role === 'Operario' && orderSelected?.quality_failed) {
      setError('Esta orden de trabajo tiene un control de calidad fallado. Un Lider o Calidad debe revisar antes de continuar.')
      return
    }

    // Validation for start action
    if (action === 'start_work_order') {
      // Check if operator is assigned
      if (!orderSelected?.employee_assigned_ids || orderSelected?.employee_assigned_ids.length === 0) {
        setError('No hay operario asignado a esta orden de trabajo. Asigne un operario antes de iniciar.')
        return
      }
      
      // Validate production order has materials
      if (!orderProduction.move_raw_ids || orderProduction.move_raw_ids.length === 0) {
        setError('No hay materiales definidos para esta orden de producción. Defina los materiales en la BOM antes de iniciar.')
        return
      }
    }

    setLoadigAction(true)
    setModalIsOpenBlocks(false)
    const update = await updateOrder(user, orderSelected, action, block_reason, qtyDone).then( res => res).catch((err) => console.log(err))

    if (update?.status) {
      const odooOrdersWork: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err))
      let orderWorkSelected = orderSelected;
      const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === orderSelected.id)
      if (action === 'finish_work_order') {
        orderWorkSelected = refreshedOrder || {...orderWorkSelected, state: 'completed', is_user_working: false, working_state: 'done', piso_active_elapsed_seconds: 0}
      } else {
        orderWorkSelected = refreshedOrder || orderSelected
      }

      setOrderSelected(orderWorkSelected)
      getDetailOrderWork(orderWorkSelected)
      setOrdersWork(odooOrdersWork)
      setLoadigAction(false)
    } else {
      const message = update?.faultString || update?.message || 'No se pudo ejecutar la accion.'
      if (action === 'finish_work_order' && isQualityControlError(message)) {
        await updateOrder(user, orderSelected, 'stop_work_order').then(res => res).catch((err) => console.log(err))
        const odooOrdersWork: any = await getWorkOrders(user).then(res => res).catch((err) => console.log(err))
        const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === orderSelected.id)
        if (refreshedOrder) {
          setOrderSelected(refreshedOrder)
          getDetailOrderWork(refreshedOrder)
        }
        if (odooOrdersWork?.data) setOrdersWork(odooOrdersWork)
        setQualityPauseMessage(getQualityPauseMessage(message))
        setLoadigAction(false)
        return
      }

      setError(message)
      setLoadigAction(false)
    }
  }

  const getMaterials = async () => {
    setMaterials([])
    const materials = await getMaterialsOrder(user, orderProduction.move_raw_ids, orderSelected).then( res => res).catch((err) => console.log(err))
    if(materials.status) {
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
      const data = await saveMaterialsOrder(
        user,
        orderSelected.id,
        orderProduction.id,
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
         modalIsOpenBlocks={modalIsOpenBlocks}
         setModalIsOpenBlocks={setModalIsOpenBlocks}
         modalIsOpenCompleteOrder={modalIsOpenCompleteOrder}
         setModalIsOpenCompleteOrder={setModalIsOpenCompleteOrder}
         blockReasons={blockReasons}
         modalIsMaterials={modalIsMaterials}
         setModalIsMaterials={setModalIsMaterials}
         getMaterials={getMaterials}
         materials={materials}
         modalIsAddMaterials={modalIsAddMaterials}
         setModalIsAddMaterials={setModalIsAddMaterials}
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
      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por OT, OP, operacion, centro o estado"
          className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-sky-950 focus:outline-none"
        />
      </div>
      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white sticky top-0">
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
              {orderedWorkOrders.map((order: any) => (
                <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                    <th className="px-3 py-2">
                      {order?.sequence}
                    </th>
                    <td className="px-3 py-2">
                      <StatusBadge status={getWorkOrderDisplayStatus(order)} />
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
