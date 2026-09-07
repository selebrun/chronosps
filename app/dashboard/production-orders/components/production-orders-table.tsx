"use client"
import { useState, useEffect, useCallback } from 'react'
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
import { getWorkOrderInstructions, getWorkOrders } from '@/app/api/orders/getOrders'
import { getMaterialsOrder, saveMaterialsOrder } from '@/app/api/getMaterialsOrder/getMaterialsOrder'
import { applySharedWorkOrderTimer } from '@/helper/applySharedWorkOrderTimer'
import { applySuccessfulWorkOrderAction } from '@/helper/applySuccessfulWorkOrderAction'

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function getOdooId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function getOdooName(value: any, fallback = 'N/A') {
  if (Array.isArray(value)) return value[1] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

function getSalesNoteName(order: any) {
  const relatedSale = String(order?.customer_sale_name || order?.x_studio_po || '').trim();
  if (relatedSale) return relatedSale;

  const origin = String(order?.origin || '').trim();
  return /^(NV\/|S\d|SO\d)/i.test(origin) ? origin : 'Sin NVENTA';
}

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
    getOdooName(order?.product_id, ''),
    order?.customer_sale_name,
    order?.origin,
    order?.x_studio_po,
    getOdooName(order?.lot_producing_id, ''),
    getOdooName(order?.user_id, ''),
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
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [workoOrder, setOrdersWork] = useState<any>(ordersWork);
  const [loadigAction, setLoadigAction] = useState<boolean>(false)
  const [modalIsOpenBlocks, setModalIsOpenBlocks] = useState(false);
  const [modalIsOpenCompleteOrder, setModalIsOpenCompleteOrder] = useState(false);
  const [modalIsMaterials, setModalIsMaterials] = useState(false);
  const [materials, setMaterials] = useState<any>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const [materialsNotice, setMaterialsNotice] = useState('');
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
    const dateilOrden = asArray(workoOrder?.data).find((orden:any) => Number(orden?.id) === Number(orderId))
    if (!dateilOrden) {
      setError('La orden de trabajo seleccionada ya no esta disponible. Actualice el listado e intente nuevamente.')
      setModalIsOpenJobDetail(false)
      return
    }
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

    setShowDetailOrderWork({
      ...dateilOrden,
      theoretical_duration: duration_expected,
      real_duration: duration,
    })
  }

  const onSaveOrderId = (order: any) => {
    const dateilOrden = asArray(workoOrder?.data)
      .filter((orden:any) => Number(getOdooId(orden?.production_id)) === Number(order?.id))
      .sort((a: any, b: any) => {
        const sequenceA = Number(a.sequence ?? a.x_studio_nro_ot ?? 0);
        const sequenceB = Number(b.sequence ?? b.x_studio_nro_ot ?? 0);
        if (sequenceA !== sequenceB) return sequenceA - sequenceB;
        return String(a.name || '').localeCompare(String(b.name || ''), 'es', { numeric: true });
      })
    setOrderWorkDetail(dateilOrden)
    setOrderProductionSelected(order)
  }
  
  const openModalInstructions = async () => {
    if (modalIsOpenInstructions) {
      setModalIsOpenInstructions(false)
      return
    }

    setModalIsOpenInstructions(true)
    setInstructionsLoading(true)
    const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected
    try {
      const response = await getWorkOrderInstructions(user, currentWorkOrder)
      if (!response?.status || !response?.data) {
        setModalIsOpenInstructions(false)
        setError(response?.message || 'No se pudieron consultar las instrucciones en Odoo.')
        return
      }
      setShowDetailOrderWork((current: any) => ({ ...current, ...response.data }))
      seOrderWorkSelected((current: any) => ({ ...current, ...response.data }))
    } catch (error: any) {
      setModalIsOpenInstructions(false)
      setError(error?.message || 'No se pudieron consultar las instrucciones en Odoo.')
    } finally {
      setInstructionsLoading(false)
    }
  }

  const syncSharedTimers = useCallback((timers: any[]) => {
    const timersByWorkOrderId = new Map<number, any>(
      timers.map((timer: any) => [Number(timer?.workorder_id), timer])
    );
    const applyTimers = (order: any) => {
      const timer = timersByWorkOrderId.get(Number(order?.id));
      return timer ? applySharedWorkOrderTimer(order, timer) : order;
    };

    seOrderWorkSelected((current: any) => applyTimers(current));
    setShowDetailOrderWork((current: any) => applyTimers(current));
    setOrderWorkDetail((current: any[]) => asArray(current).map((order: any) => applyTimers(order)));
    setOrdersWork((current: any) => current?.data
      ? { ...current, data: current.data.map((order: any) => applyTimers(order)) }
      : current
    );
  }, []);

  const syncSharedTimer = useCallback((timer: any) => {
    syncSharedTimers([timer]);
  }, [syncSharedTimers]);

  const timerWorkOrderIds = asArray(workoOrder?.data)
    .map((order: any) => Number(order?.id))
    .filter(Boolean)
    .sort((left: number, right: number) => left - right)
    .join(',');

  useEffect(() => {
    if (!timerWorkOrderIds) return;

    let active = true;
    let requestInFlight = false;
    const synchronizeList = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch(`/api/work-order-timers?ids=${timerWorkOrderIds}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        if (!response.ok) return;

        const payload = await response.json();
        if (active && payload?.status && Array.isArray(payload.data) && payload.data.length) {
          syncSharedTimers(payload.data);
        }
      } catch (error) {
        console.error('No se pudieron actualizar los estados compartidos de las OT:', error);
      } finally {
        requestInFlight = false;
      }
    };

    void synchronizeList();
    const interval = window.setInterval(() => void synchronizeList(), 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [timerWorkOrderIds, syncSharedTimers]);

  const isQualityControlError = (message: string) => {
    const normalizedMessage = (message || '').toLowerCase();
    return normalizedMessage.includes('calidad') || normalizedMessage.includes('quality');
  }

  const getQualityPauseMessage = (message: string) => {
    return `${message.replace('usando el taller', 'usando el módulo de calidad')} La orden de trabajo fue pausada para realizar los controles de calidad.`
  }

  const executeWorkOrderAction = async (action: string, block_reason?: any | undefined, qtyDone?: number | undefined, elapsedSeconds?: number | undefined ) => {
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
    const update = await updateOrder(user, currentWorkOrder, action, block_reason, qtyDone, elapsedSeconds).then( res => res).catch((err) => console.log(err))
    if (update?.status) {
      const odooOrdersWork: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err))
      const optimisticOrder = applySuccessfulWorkOrderAction(currentWorkOrder, action)
      const refreshedWorkOrders = odooOrdersWork?.status ? asArray(odooOrdersWork?.data) : []
      const dateilOrden = refreshedWorkOrders.filter((orden:any) => Number(getOdooId(orden?.production_id)) === Number(orderProductionSelected?.id))

      let orderWorkSelected1 = optimisticOrder;
      const refreshedOrder = refreshedWorkOrders.find((item: any) => Number(item?.id) === Number(currentWorkOrder?.id))
      orderWorkSelected1 = refreshedOrder || optimisticOrder

      seOrderWorkSelected(orderWorkSelected1)
      setShowDetailOrderWork(orderWorkSelected1)
      if (odooOrdersWork?.status) {
        setOrderWorkDetail(dateilOrden)
        setOrdersWork(odooOrdersWork)
      } else {
        setOrderWorkDetail((current: any[]) => asArray(current).map((item: any) => Number(item?.id) === Number(currentWorkOrder?.id) ? optimisticOrder : item))
        setOrdersWork((current: any) => current?.data
          ? { ...current, data: current.data.map((item: any) => Number(item?.id) === Number(currentWorkOrder?.id) ? optimisticOrder : item) }
          : current
        )
      }
      setLoadigAction(false)
    } else {
      const message = update?.faultString || update?.message || 'No se pudo ejecutar la accion.'
      if (action === 'finish_work_order' && isQualityControlError(message)) {
        const odooOrdersWork: any = await getWorkOrders(user).then(res => res).catch((err) => console.log(err))
        const refreshedWorkOrders = asArray(odooOrdersWork?.data)
        const dateilOrden = refreshedWorkOrders.filter((orden:any) => Number(getOdooId(orden?.production_id)) === Number(orderProductionSelected?.id))
        const refreshedOrder = refreshedWorkOrders.find((item: any) => Number(item?.id) === Number(currentWorkOrder?.id))
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
    setMaterialsError('')
    setMaterialsNotice('')
    setMaterialsLoading(true)
    const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected;
    try {
      const response: any = await Promise.race([
        getMaterialsOrder(user, orderProductionSelected.move_raw_ids || [], currentWorkOrder),
        new Promise((resolve) => window.setTimeout(
          () => resolve({ status: false, message: 'Odoo no respondio a tiempo al consultar los materiales.' }),
          20000
        )),
      ])
      if (response?.status) {
        setMaterials(Array.isArray(response.data) ? response.data : [])
        setMaterialsNotice(response?.notice || '')
      } else {
        setMaterialsError(response?.message || 'No se pudieron consultar los materiales de la orden de trabajo.')
      }
    } catch (error: any) {
      setMaterialsError(error?.message || 'No se pudieron consultar los materiales de la orden de trabajo.')
    } finally {
      setMaterialsLoading(false)
    }
  }

  const onAddMaterial = async (material: any, total: number) => { 
    const quantity = Number(total)
    const materialSelected = materials.find((item: any) => Number(item.id) === Number(material))
    if (!materialSelected) {
      setError('No se encontro el material seleccionado.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Ingrese una cantidad de material mayor que cero.')
      return
    }
    setOrderMaterialsSelected({ ...materialSelected, additional_quantity: quantity })
    setDisabledBtnSaveMaterial(false)
  }

  const onSaveMaterialsOrder = async () => {
    setLoadigSaveMaterials(true)
    try {
      const currentWorkOrder = showDetailOrderWork?.id ? showDetailOrderWork : orderWorkSelected;
      const productId = Number(getOdooId(orderMaterialsSelected?.product_id));
      const uomId = Number(getOdooId(orderMaterialsSelected?.product_uom));
      const locationId = Number(getOdooId(orderMaterialsSelected?.location_id));
      const locationDestId = Number(getOdooId(orderMaterialsSelected?.location_dest_id));
      const companyId = Number(getOdooId(orderMaterialsSelected?.company_id));
      const quantity = Number(orderMaterialsSelected?.additional_quantity);
      if (!currentWorkOrder?.id || !orderProductionSelected?.id || !productId || !uomId || !locationId || !locationDestId || !companyId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('El material seleccionado no tiene todos los datos requeridos por Odoo.');
      }
      const data = await saveMaterialsOrder(
        user,
        currentWorkOrder.id,
        orderProductionSelected.id,
        productId,
        uomId,
        quantity,
        locationId,
        locationDestId,
        companyId,
        getOdooName(orderMaterialsSelected.product_id, ''),
        getOdooId(currentWorkOrder?.operation_id) || getOdooId(orderMaterialsSelected.operation_id)
      )

      if (data?.status) {
        setDisabledBtnSaveMaterial(true)
        setModalIsMaterials(false)
        setOrderMaterialsSelected({})
        if (data?.warning) setError(data.warning)
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
    asArray(workoOrder?.data).map((workOrder: any) => Number(getOdooId(workOrder?.production_id))).filter(Boolean)
  );
  const productionOrders = [...asArray(odooOrders?.data)].sort((a: any, b: any) => {
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
         instructionsLoading={instructionsLoading}
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
         materialsLoading={materialsLoading}
         materialsError={materialsError}
         materialsNotice={materialsNotice}
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
         onSharedTimerSync={syncSharedTimer}
        />
      }
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por OP, NVENTA, producto, lote, responsable o estado"
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
                NVENTA
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
                  {getOdooName(order.product_id, 'Sin producto')}
                </td>
                <td className="px-3 py-2">
                 {getSalesNoteName(order)}
                </td>
                <td className="px-3 py-2">
                  {order.qty_producing}/{order.product_qty}
                </td>
                <td className="px-3 py-2">
                  {getOdooName(order.lot_producing_id, 'Sin lote')}
                </td>
                <td className="px-3 py-2">
                  {getOdooName(order.user_id, 'Sin responsable')}
                </td>
                <td className="px-3 py-2">
                  {order.date_planned_start || 'Sin fecha'}
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
