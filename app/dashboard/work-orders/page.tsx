import { getWorkOrders } from '@/app/api/orders/getOrders'
import { getServerSession } from 'next-auth'
import { config } from '@/auth';
import eyeDetails from '@/public/eyeDetails.svg'
import Link from 'next/link';
import Image from 'next/image'
import { StatusBadge } from '@/ui/status-badge/status-badge';

export default async function Page() {
  const session = await getServerSession(config);
  const user = session.user;
  const odooOrders: any = await getWorkOrders(user).then( res => res).catch((err) => console.log(err));

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      { odooOrders?.data.length ? (
      <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
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
              {odooOrders?.data?.map((order: any) => (
                <tr key={`production-order-${order.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                    <th className="px-3 py-2">
                      {order.id}
                    </th>
                    <td className="px-3 py-2">
                      <StatusBadge status={order.state} />
                    </td>
                    <td className="px-3 py-2">{order.name}</td>
                    <td className="px-3 py-2">{order.production_id[1]}</td>
                    <td className="px-3 py-2">{order.workcenter_id[1]}</td>
                    <td className="px-3 py-2">{order.date_planned_start}</td>
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
      </div>
      )}
    </div>
  );
}
