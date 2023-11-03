import Link from 'next/link';
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'
import { getProductionOrders } from '@/app/api/orders/getOrders'
import { getServerSession } from 'next-auth'
import { config } from '@/auth';

//UI Components
import { StatusBadge } from '@/ui/status-badge/status-badge';

export default async function Page() {
  const session = await getServerSession(config);
  const user = session.user;
  const odooOrders: any = await getProductionOrders(user).then( res => res).catch((err) => console.log(err));

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <h1 className="text-xl font-bold mb-3">Órdenes de producción</h1>

      { odooOrders?.data.length ? (
      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[80vh] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto table-auto">
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
                    <Link
                      href={`production-orders/${order.id}`}>
                      <Image
                        src={eyeDetails}
                        alt="Eye Details"
                        className='w-20 h-5'
                      />
                    </Link>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>
      ) : (

        <div className="text-center block p-6 bg-white border border-gray-200 rounded-lg shadow bg-gray-100">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">No hay órdenes asignadas</h5>
          <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">Usted no tiene ninguna orden de produccion asignada.</p>
          <a href="/dashboard" className="inline-flex justify-center items-center py-2 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300">
              Volver al menú
          </a>
        </div>
      )}
    </div>
  );
}
