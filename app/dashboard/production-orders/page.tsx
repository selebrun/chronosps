import Link from 'next/link';
import { getOrders, getProductionOrders } from '@/app/api/orders/getOrders';

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

      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
                <tr>
                  <th scope="col" className="px-6 py-3 ">
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
                <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                    <th scope="row" className="px-5 font-medium text-black dark:text-white w-5">
                      <div className="flex items-center space-x-4 w-60 whitespace-normal">
                          <div className="dark:text-white">
                              <div className="text-sm text-black">{order.name}</div>
                          </div>
                      </div>
                    </th>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded
                        ${order.state === "progress"? "bg-indigo-100 text-indigo-900": order.state === "confirmed"? "bg-green-100 text-green-900" : ""}`}>
                        {order.state}
                      </span>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 37 37" fill="none" className="text-black">
                              <path fillRule="evenodd" clipRule="evenodd" d="M18.5003 7.70825C10.792 7.70825 4.20908 12.5028 1.54199 19.2708C4.20908 26.0387 10.792 30.8333 18.5003 30.8333C26.2087 30.8333 32.7916 26.0387 35.4587 19.2708C32.7916 12.5028 26.2087 7.70825 18.5003 7.70825ZM18.5003 26.9791C14.2453 26.9791 10.792 23.5258 10.792 19.2708C10.792 15.0158 14.2453 11.5624 18.5003 11.5624C22.7553 11.5624 26.2087 15.0158 26.2087 19.2708C26.2087 23.5258 22.7553 26.9791 18.5003 26.9791ZM18.5003 14.6458C15.9412 14.6458 13.8753 16.7116 13.8753 19.2708C13.8753 21.8299 15.9412 23.8958 18.5003 23.8958C21.0595 23.8958 23.1253 21.8299 23.1253 19.2708C23.1253 16.7116 21.0595 14.6458 18.5003 14.6458Z"
                                fill="currentColor"/>
                        </svg>
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
