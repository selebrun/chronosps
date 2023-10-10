import Link from 'next/link';
import { getOrders, getProductionOrders } from '@/app/api/orders/getOrders';

const testUser = {
  name: 'Simon Lebrun Sposito',
  email: 'simon@chronosps.com',
  mobile: 'false',
  password: 'ffffe4c9c6ef337d5a9b60d6423782a1',
  odoo_id: 686,
  odoo_user_id: 0,
  document: '10203040',
  role: 'Operario',
  hash: 'fbebfaed3f02007236b5075c64b5d8e2392ed46e93d53859e83f3e5df8d8bfef',
  active: true,
}
const testCompanyId = "7ac7aa42-008b-11ee-be56-0242ac120002";//"889cd134-00b2-11ee-be56-0242ac120002";



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
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Estado
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
                <tr key={`production-order-${order.id}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <th scope="row" className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white w-5">
                      <div className="flex items-center space-x-4 w-60 whitespace-normal">
                          <div className="font-medium dark:text-white">
                              <div className="text-sm text-gray-500 dark:text-gray-400">{order.name}</div>
                              <div>{order.product_id[1]}</div>
                          </div>
                      </div>
                    </th>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">{order.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.qty_producing}/{order.product_qty}
                    </td>
                    <td className="px-6 py-4">
                      {order.lot_producing_id[1]}
                    </td>
                    <td className="px-6 py-4">
                      {order.user_id[1]}
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

    </div>
  );
}
