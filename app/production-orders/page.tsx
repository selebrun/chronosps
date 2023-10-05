import Link from 'next/link';
import { getOrders, getProductionOrders } from '@/app/api/orders/getOrders';
// import { getOdooData } from '@/app/api/odoo/odooService';


const testUser = {
  name: 'Alfonso Schiavino',
  email: 'alfonso@chronosps.com',
  mobile: '+56 9 3431 2199',
  password: 'f05c9eb802ba34adc664326a72a27f8b',
  odoo_id: 7,
  odoo_user_id: 6,
  document: '23400447-6',
  role: 'Operario',
  hash: 'f47a8632fb94c9f081fe429c33136b39f29153b7698e22d7a32d3ffb597280f0',
  active: true,
}
const testCompanyId = "889cd134-00b2-11ee-be56-0242ac120002";



export default async function Page() {
  const orders = await getOrders();
  const odooOrders: any = await getProductionOrders(testUser, testCompanyId);

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <h1 className="text-xl font-bold mb-3">Órdenes de producción</h1>

      <div className='mb-7'>
        <p>
          This example uses context to share state between Client Components
          that cross the Server/Client Component boundary.
        </p>
        <p>
          Try incrementing the counter and navigating between pages. Note how
          the counter state is shared across the app even though they are inside
          different layouts and pages that are Server Components.
        </p>
      </div>


      <div className="relative overflow-y-auto h-fit">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="px-6 py-3">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Nombre
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Cantidad
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Cantidad Producida
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Inicio programado
                    </th>
                    <th scope="col" className="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody>
              {odooOrders?.data?.map((order: any) => (
                <tr key={`production-order-${order.id}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4">
                      {order.id}
                    </td>
                    <th scope="row" className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    <div className="flex items-center space-x-4">
                        <div className="font-medium dark:text-white">
                            <div>{order.product_id[1]}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{order.name}</div>
                        </div>
                    </div>
                    </th>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{order.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.product_qty}
                    </td>
                    <td className="px-6 py-4">
                      {order.qty_producing}
                    </td>
                    <td className="px-6 py-4">
                      {order.date_planned_start}
                    </td>
                    <td className="px-6 py-4">
                    <Link
                      href={`production-orders/${order.id}`}
                      className="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
                    >
                      Detalle
                    </Link>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>


      <div className="relative overflow-y-auto h-fit">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="px-6 py-3">
                      NO. OT
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
                      Cenro de trabajo
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Inicio programado
                    </th>
                    <th scope="col" className="px-6 py-3">
                        
                    </th>
                </tr>
            </thead>
            <tbody>
                {orders.map((order: any) => (
                <tr key={order.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <th scope="row" className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    <div className="flex items-center space-x-4">
                        <img className="w-10 h-10 rounded-full" src={order.image} alt=""/>
                        <div className="font-medium dark:text-white">
                            <div>{order.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{order.gender}</div>
                        </div>
                    </div>
                    </th>
                    <td className="px-6 py-4">
                      {order.species}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{order.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.origin.name}
                    </td>
                    <td className="px-6 py-4">
                      {order.location.name}
                    </td>
                    <td className="px-6 py-4">
                      {order.created}
                    </td>
                    <td className="px-6 py-4">
                    <Link
                      href={`production-orders/${order.id}`}
                      className="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
                    >
                      Detalle
                    </Link>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>

    </div>
  );
}
