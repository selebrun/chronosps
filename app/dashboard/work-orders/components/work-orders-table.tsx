"use client"
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
// UI Components

import { getStatusLabel, StatusBadge } from '@/ui/status-badge/status-badge'
import { ModalDetailWork } from '@/ui/modal-detail-work/ModalDetailWork'
import { StatusHelpButton } from '@/ui/status-help-button/StatusHelpButton'
import { updateOrder } from '@/app/api/updateOrder/updateOrder'
import { getWorkOrderInstructions, getWorkOrders } from '@/app/api/orders/getOrders'
import { getMaterialsOrder, saveMaterialsOrder } from '@/app/api/getMaterialsOrder/getMaterialsOrder'
import { applySharedWorkOrderTimer } from '@/helper/applySharedWorkOrderTimer'
import { applySuccessfulWorkOrderAction } from '@/helper/applySuccessfulWorkOrderAction'
import { withPromiseTimeout } from '@/helper/withPromiseTimeout'
import { assignWorkOrderOperator } from '@/app/api/orderAssignments/orderAssignments'

function getWorkOrderDisplayStatus(order: any) {
  if (order?.local_blocked) return 'blocked';
  if (order?.quality_failed) return 'quality_failed';
  if (order?.quality_pending) return 'quality_pending';
  if (order?.working_state === 'paused') return 'paused';
  if (order?.is_user_working || order?.working_state === 'progress') return 'progress';
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
    getStatusLabel(getWorkOrderDisplayStatus(order)),
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

export function WorkOrdersTable({ odooOrders, user, blockReasons, assignmentOptions }: {
  odooOrders: any,
  user: any,
  blockReasons: any,
  assignmentOptions?: any,
}) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalIsOpenInstructions, setModalIsOpenInstructions] = useState(false);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [orderProduction, setOrderProduction] = useState<any>({});
  const [showDetailOrderWork, setShowDetailOrderWork] = useState<any>({});
  const [workoOrder, setOrdersWork] = useState<any>(odooOrders);
  const [loadigAction, setLoadigAction] = useState<boolean>(false)
  const [orderSelected, setOrderSelected] = useState<any>({});
  const [modalIsOpenBlocks, setModalIsOpenBlocks] = useState(false);
  const [modalIsOpenCompleteOrder, setModalIsOpenCompleteOrder] = useState(false);
  const [modalIsMaterials, setModalIsMaterials] = useState(false);
  const [materials, setMaterials] = useState<any>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const [materialsNotice, setMaterialsNotice] = useState('');
  const [modalIsAddMaterials, setModalIsAddMaterials] = useState(false);
  const [loadigSaveMaterials, setLoadigSaveMaterials] = useState(false);
  const [orderMaterialsSelected, setOrderMaterialsSelected] = useState<any>({});
  const [disabledBtnSaveMaterial, setDisabledBtnSaveMaterial] = useState(true);
  const [error, setError] = useState<string>('');
  const [qualityPauseMessage, setQualityPauseMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentLoadingId, setAssignmentLoadingId] = useState<number | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const normalizedRole = String(user?.role || '').trim();
  const canAssignOperator = ['Admin', 'Administrador', 'chronosAdmin', 'Lider', 'Jefe'].includes(normalizedRole);
  const employeeOptions = Array.isArray(assignmentOptions?.employees) ? assignmentOptions.employees : [];


  useEffect(()=>{
    if(!user.materiales) {
      setDisabledBtnSaveMaterial(true)
    }
  }, [user?.materiales])

  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }


  const openModalInstructions = async () => {
    if (modalIsOpenInstructions) {
      setModalIsOpenInstructions(false)
      return
    }

    setModalIsOpenInstructions(true)
    setInstructionsLoading(true)
    const currentWorkOrder = orderSelected?.id ? orderSelected : showDetailOrderWork
    try {
      const response = await getWorkOrderInstructions(user, currentWorkOrder)
      if (!response?.status || !response?.data) {
        setModalIsOpenInstructions(false)
        setError(response?.message || 'No se pudieron consultar las instrucciones en Odoo.')
        return
      }
      setOrderSelected((current: any) => ({ ...current, ...response.data }))
      setShowDetailOrderWork((current: any) => ({ ...current, ...response.data }))
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

    setOrderSelected((current: any) => applyTimers(current));
    setShowDetailOrderWork((current: any) => applyTimers(current));
    setOrdersWork((current: any) => current?.data
      ? { ...current, data: current.data.map((order: any) => applyTimers(order)) }
      : current
    );
  }, []);

  const syncSharedTimer = useCallback((timer: any) => {
    syncSharedTimers([timer]);
  }, [syncSharedTimers]);

  const timerWorkOrderIds = (workoOrder?.data || [])
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
  
  const progress = getWorkOrderProgress(showDetailOrderWork)
  const orderedWorkOrders = sortWorkOrdersByProductionAndSequence(workoOrder?.data || []).filter((order: any) => workOrderMatchesSearch(order, searchTerm))

  const isQualityControlError = (message: string) => {
    const normalizedMessage = (message || '').toLowerCase();
    return normalizedMessage.includes('calidad') || normalizedMessage.includes('quality');
  }

  const getQualityPauseMessage = (message: string) => {
    return `${message.replace('usando el taller', 'usando el módulo de calidad')} La orden de trabajo fue pausada para realizar los controles de calidad.`
  }

  const executeWorkOrderAction = async (action: string, block_reason?: any | undefined, qtyDone?: number | undefined, elapsedSeconds?: number | undefined ) => {
    if (loadigAction) return

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
    try {
      const update: any = await withPromiseTimeout(
        updateOrder(user, orderSelected, action, block_reason, qtyDone, elapsedSeconds),
        30000,
        'La accion esta tardando demasiado. La pantalla fue liberada; actualice la OT antes de reintentar.'
      )

      if (update?.status) {
        let odooOrdersWork: any = null
        try {
          odooOrdersWork = await withPromiseTimeout(
            getWorkOrders(user),
            30000,
            'Odoo confirmo la accion, pero no respondio a tiempo al refrescar la OT.'
          )
        } catch (refreshError) {
          console.warn('No se pudo refrescar la OT despues de la accion:', refreshError)
        }
        const optimisticOrder = applySuccessfulWorkOrderAction(orderSelected, action)
        const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === orderSelected.id)
        const orderWorkSelected = refreshedOrder || optimisticOrder

        setOrderSelected(orderWorkSelected)
        getDetailOrderWork(orderWorkSelected)
        if (odooOrdersWork?.status && Array.isArray(odooOrdersWork?.data)) {
          setOrdersWork(odooOrdersWork)
        } else {
          setOrdersWork((current: any) => current?.data
            ? { ...current, data: current.data.map((item: any) => item.id === orderSelected.id ? optimisticOrder : item) }
            : current
          )
        }
      } else {
        const message = update?.faultString || update?.message || 'No se pudo ejecutar la accion.'
        if (action === 'finish_work_order' && isQualityControlError(message)) {
          let odooOrdersWork: any = null
          try {
            odooOrdersWork = await withPromiseTimeout(getWorkOrders(user), 30000, 'No se pudo refrescar la OT a tiempo.')
          } catch (refreshError) {
            console.warn('No se pudo refrescar la OT al solicitar Calidad:', refreshError)
          }
          const refreshedOrder = odooOrdersWork?.data?.find((item: any) => item.id === orderSelected.id)
          if (refreshedOrder) {
            setOrderSelected(refreshedOrder)
            getDetailOrderWork(refreshedOrder)
          }
          if (odooOrdersWork?.data) setOrdersWork(odooOrdersWork)
          setQualityPauseMessage(update?.qualityPause ? message : getQualityPauseMessage(message))
          return
        }

        setError(message)
      }
    } catch (actionError: any) {
      setError(actionError?.message || 'No se pudo ejecutar la accion. La pantalla fue liberada para volver a intentarlo.')
    } finally {
      setLoadigAction(false)
    }
  }

  const getMaterials = async () => {
    setMaterials([])
    setMaterialsError('')
    setMaterialsNotice('')
    setMaterialsLoading(true)
    try {
      const response: any = await Promise.race([
        getMaterialsOrder(user, orderProduction.move_raw_ids || [], orderSelected),
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
      const productId = Number(getOdooId(orderMaterialsSelected?.product_id))
      const uomId = Number(getOdooId(orderMaterialsSelected?.product_uom))
      const locationId = Number(getOdooId(orderMaterialsSelected?.location_id))
      const locationDestId = Number(getOdooId(orderMaterialsSelected?.location_dest_id))
      const companyId = Number(getOdooId(orderMaterialsSelected?.company_id))
      const quantity = Number(orderMaterialsSelected?.additional_quantity)
      if (!orderSelected?.id || !orderProduction?.id || !productId || !uomId || !locationId || !locationDestId || !companyId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('El material seleccionado no tiene todos los datos requeridos por Odoo.')
      }
      const data = await saveMaterialsOrder(
        user,
        orderSelected.id,
        orderProduction.id,
        productId,
        uomId,
        quantity,
        locationId,
        locationDestId,
        companyId,
        getOdooName(orderMaterialsSelected.product_id),
        getOdooId(orderSelected?.operation_id) || getOdooId(orderMaterialsSelected?.operation_id)
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

  const onAssignOperator = async (workOrder: any, employeeIdValue: string) => {
    const workOrderId = Number(workOrder?.id)
    if (!workOrderId || assignmentLoadingId) return

    const employeeId = Number(employeeIdValue) || 0
    setAssignmentLoadingId(workOrderId)
    setAssignmentMessage(null)
    try {
      const response: any = await assignWorkOrderOperator(workOrderId, employeeId)
      if (!response?.status) {
        setAssignmentMessage({ type: 'error', text: response?.message || 'No se pudo asignar el operador.' })
        return
      }

      const employeeIds = employeeId ? [employeeId] : []
      const updateAssignment = (order: any) => Number(order?.id) === workOrderId
        ? { ...order, employee_assigned_ids: employeeIds }
        : order

      setOrdersWork((current: any) => current?.data
        ? { ...current, data: current.data.map(updateAssignment) }
        : current
      )
      setOrderSelected((current: any) => updateAssignment(current))
      setShowDetailOrderWork((current: any) => updateAssignment(current))
      setAssignmentMessage({ type: 'success', text: response?.message || 'Operador asignado correctamente.' })
    } catch (assignmentError: any) {
      setAssignmentMessage({ type: 'error', text: assignmentError?.message || 'No se pudo asignar el operador.' })
    } finally {
      setAssignmentLoadingId(null)
    }
  }

  const getAssignedOperatorId = (order: any) => {
    const assignedIds = Array.isArray(order?.employee_assigned_ids) ? order.employee_assigned_ids : []
    return Number(assignedIds[0]) || 0
  }

  const getAssignedOperatorName = (order: any) => {
    const employeeId = getAssignedOperatorId(order)
    if (!employeeId) return 'Sin operador'
    return employeeOptions.find((employee: any) => Number(employee?.id) === employeeId)?.name || `Empleado ${employeeId}`
  }


  return (
    <>
      {modalIsOpen && 
        <ModalDetailWork
         modalIsOpenJobDetail={modalIsOpen}
         setModalIsOpenJobDetail={(open: boolean) => {
           setModalIsOpen(open)
           if (!open) setLoadigAction(false)
         }}
         orderProductionSelected={orderProduction}
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
         getMaterials={getMaterials}
         materials={materials}
         materialsLoading={materialsLoading}
         materialsError={materialsError}
         materialsNotice={materialsNotice}
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
         onSharedTimerSync={syncSharedTimer}
        />
      }
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por OT, OP, operacion, centro o estado"
          className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 p-3 text-sm text-gray-900 shadow-sm focus:border-sky-950 dark:focus:border-sky-400 focus:outline-none"
        />
        <StatusHelpButton module="workorder" />
      </div>
      {assignmentMessage && (
        <div
          role="alert"
          className={`mb-4 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${assignmentMessage.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}
        >
          <span>{assignmentMessage.text}</span>
          <button type="button" onClick={() => setAssignmentMessage(null)} className="ml-4 font-bold" aria-label="Cerrar mensaje">X</button>
        </div>
      )}
      <div className="relative max-h-[calc(100vh-13.5rem)] min-h-[calc(100vh-13.5rem)] max-w-full overflow-x-auto overflow-y-auto rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300 relative overflow-y-auto">
            <thead className="text-xs text-black dark:text-gray-100 uppercase bg-strongCyan dark:bg-sky-900 border-b-8 border-white dark:border-gray-800 sticky top-0">
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
                    Operador
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Inicio programado
                  </th>
                  <th scope="col" className="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody>
              {orderedWorkOrders.map((order: any) => (
                <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:border-gray-800 bg-lightCyan dark:bg-gray-700 text-black dark:text-gray-100">
                    <th className="px-3 py-2">
                      {order?.sequence}
                    </th>
                    <td className="px-3 py-2">
                      <StatusBadge status={getWorkOrderDisplayStatus(order)} />
                    </td>
                    <td className="px-3 py-2">{order.name}</td>
                    <td className="px-3 py-2">{order.production_id[1]}</td>
                    <td className="px-3 py-2">{order.workcenter_id[1]}</td>
                    <td className="min-w-[220px] px-3 py-2">
                      {canAssignOperator ? (
                        <select
                          aria-label={`Asignar operador a OT ${order.sequence || order.id}`}
                          value={getAssignedOperatorId(order)}
                          disabled={assignmentLoadingId === Number(order.id)}
                          onChange={(event) => void onAssignOperator(order, event.target.value)}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 disabled:cursor-wait disabled:opacity-60 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
                        >
                          <option value={0}>Sin operador</option>
                          {employeeOptions.map((employee: any) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}{employee.identification_id ? ` (${employee.identification_id})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : getAssignedOperatorName(order)}
                    </td>
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
