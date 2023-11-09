"use client"
import { useState } from 'react'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'

// UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge'
import { Modal } from '@/ui/modal/modal'

const openWorkOrders = () => {
    console.log("Se abre la modal, y se mandan eventos")

}

export function ProductionOrdersTable({ odooOrders }: { odooOrders: any }) {

    const [ modalIsOpen, setModalIsOpen ] = useState(false);

    const openWorkOrders = () => {
        // Acá se haria la peticion a las workOrder
        // para luego guardarlas en un estado y pasarlas como prop
        // a un componente donde esté la tabla de workOrders
        setModalIsOpen(!modalIsOpen)
    }
  
    return (
        <>
        {/* Work Oders Modal */}
        <Modal setOpen={modalIsOpen} title='Órdenes de trabajo' className='max-w-2xl'>
            <p className="text-sm mb-3 text-gray-500">
                Hola, soy el contenido de la Modal, aqui puede ir un ReactChild Node lo que permite renderizar cualquier componente de React
            </p>


            {/* Esto es una prueba de ejemplo */}
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
                            <button onClick={openWorkOrders}>
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
            {/* END - Esto es una prueba de ejemplo */}

            <div className="mt-4">
                <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={() => setModalIsOpen(false)}
                >
                    cerrar
                </button>
            </div>
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
                        <button onClick={openWorkOrders}>
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
  