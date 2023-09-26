import Link from 'next/link';
import { getOrders } from "../api/orders/getOrders";

export default async function Page() {
  const orders = await getOrders();
  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <h1 className="text-xl font-bold mb-3">Órdenes de producción</h1>

      <ul className='mb-7'>
        <li>
          This example uses context to share state between Client Components
          that cross the Server/Client Component boundary.
        </li>
        <li>
          Try incrementing the counter and navigating between pages. Note how
          the counter state is shared across the app even though they are inside
          different layouts and pages that are Server Components.
        </li>
      </ul>

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
