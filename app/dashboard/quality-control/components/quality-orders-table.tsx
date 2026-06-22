"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import close from '@/public/close.png'
// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { ModalOrderQuality } from './modal-order-quality'
import { acceptQualityControl, rejectQualityControl, saveQualityControlNotes } from '@/app/api/accionQualityControl/accionQualityControl'

function sortByNameAsc(a: any, b: any) {
  return (a?.name || '').localeCompare(b?.name || '', 'es', { numeric: true, sensitivity: 'base' });
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
    order?.product_id?.[1],
    order?.lot_producing_id?.[1],
    order?.user_id?.[1],
    order?.date_planned_start,
  ].map(normalizeSearchText).join(' ');

  return searchableText.includes(normalizedTerm);
}

function getWorkOrderName(order: any) {
  return Array.isArray(order?.workorder_id) ? order.workorder_id[1] : order?.workorder_id || '';
}

function getMany2OneId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function getWorkOrderSequence(order: any) {
  const sequence = Number(order?.workorder_sequence);
  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
}

function sortQualityControlsAsc(a: any, b: any) {
  const sequenceComparison = getWorkOrderSequence(a) - getWorkOrderSequence(b);
  if (sequenceComparison !== 0) return sequenceComparison;

  const workOrderComparison = getWorkOrderName(a).localeCompare(getWorkOrderName(b), 'es', { numeric: true, sensitivity: 'base' });
  if (workOrderComparison !== 0) return workOrderComparison;

  return sortByNameAsc(a, b);
}

function getProductionQualityPriority(production: any, qualityChecks: any[]) {
  const productionChecks = qualityChecks.filter((check: any) => getMany2OneId(check.production_id) === production.id);
  if (productionChecks.some((check: any) => check.quality_state === 'fail')) return 0;
  if (productionChecks.some((check: any) => !['pass', 'fail'].includes(check.quality_state))) return 1;
  return 2;
}

function sortProductionsByQualityPriority(qualityChecks: any[]) {
  return (a: any, b: any) => {
    const priorityComparison = getProductionQualityPriority(a, qualityChecks) - getProductionQualityPriority(b, qualityChecks);
    if (priorityComparison !== 0) return priorityComparison;

    const dateComparison = String(a?.date_planned_start || '').localeCompare(String(b?.date_planned_start || ''), 'es', { numeric: true });
    if (dateComparison !== 0) return dateComparison;

    return sortByNameAsc(a, b);
  };
}


export function QualityOrdersTable({ odooOrders, user }:{ odooOrders: any, user: any }) {
  const [orderQualityDetail, setOrderQualityDetail] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalDetailsIsOpen, setModalDetailsIsOpen] = useState(false);
  const [selectedOrderQuantity, setSelectedOrderQuantity] = useState({});
  const [ordersQualityControl, setOrdersQualityControl] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const productionIdsInQuality = new Set(
      (odooOrders?.data ?? []).map((work: any) => work?.production_id?.[0])
    )

    const qualityChecks = odooOrders?.data ?? [];
    const orders = (odooOrders?.production_data ?? []).filter(
      (production: any) => productionIdsInQuality.has(production?.id)
    ).sort(sortProductionsByQualityPriority(qualityChecks))

    setOrdersQualityControl(orders)
  }, [odooOrders?.data, odooOrders?.production_data])

  const filteredQualityOrders = ordersQualityControl.filter((order: any) => productionMatchesSearch(order, searchTerm));


  const  openJobDetail= () => {
    setModalDetailsIsOpen(!modalDetailsIsOpen)
  }

  const openWorkOrders = () => {
    setModalIsOpen(!modalIsOpen)
  }

  const onSaveOrderId = (order: any) => {
    const dateilOrden = odooOrders?.data
      .filter((orden:any) => getMany2OneId(orden.production_id) === order.id)
      .sort(sortQualityControlsAsc)
    setOrderQualityDetail(dateilOrden)
    setSelectedOrderQuantity({})
    setModalDetailsIsOpen(false)
  }
  
  const selectedQualityDetails = (order : any) =>{
    setSelectedOrderQuantity(order)
  }

  const acceptOrder = async (observations?: string) => {
    return acceptQualityControl(user, selectedOrderQuantity, observations)
      .then((res) => {
        if (res?.status) {
          setSelectedOrderQuantity((current: any) => ({ ...current, quality_state: 'pass', additional_note: observations || '' }))
          setOrderQualityDetail((current: any) => current.map((item: any) => item.id === (selectedOrderQuantity as any).id ? { ...item, quality_state: 'pass', additional_note: observations || '' } : item))
        }
        return res
      })
      .catch((err) => {
        console.log(err)
        return { status: false }
      })
  }

  const rejectOrder = async (observations?: string) => {
    return rejectQualityControl(user, selectedOrderQuantity, observations)
      .then((res) => {
        if (res?.status) {
          setSelectedOrderQuantity((current: any) => ({ ...current, quality_state: 'fail', additional_note: observations || '' }))
          setOrderQualityDetail((current: any) => current.map((item: any) => item.id === (selectedOrderQuantity as any).id ? { ...item, quality_state: 'fail', additional_note: observations || '' } : item))
        }
        return res
      })
      .catch((err) => {
        console.log(err)
        return { status: false }
      })
  }

  const saveNotes = async (observations?: string) => {
    return saveQualityControlNotes(user, selectedOrderQuantity, observations)
      .then((res) => {
        if (res?.status) {
          setSelectedOrderQuantity((current: any) => ({ ...current, additional_note: observations || '' }))
          setOrderQualityDetail((current: any) => current.map((item: any) => item.id === (selectedOrderQuantity as any).id ? { ...item, additional_note: observations || '' } : item))
        }
        return res
      })
      .catch((err) => {
        console.log(err)
        return { status: false, message: 'No se pudieron guardar las notas.' }
      })
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
        rejectOrder={rejectOrder}
        saveNotes={saveNotes}
        user={user}
      /> 
      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por OP, producto, lote, responsable o estado"
          className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-sky-950 focus:outline-none"
        />
      </div>
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
            {filteredQualityOrders?.map((order: any) => (
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
        {filteredQualityOrders.length  === 0 && 
              <div className='text-center w-full text-xl mt-10'>
                No se encontro ordenes
              </div>}
      </div>
    </>
  )
}
