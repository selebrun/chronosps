import { getProductionOrders } from '@/app/api/orders/getOrders'
import { getServerSession } from 'next-auth'
import { config } from '@/auth';

// UI Components
import { ProductionOrdersTable } from '@/app/dashboard/production-orders/components/production-orders-table';

export default async function Page() {
  const session = await getServerSession(config);
  const user = session.user;
  const odooOrders: any = await getProductionOrders(user).then( res => res).catch((err) => console.log(err));

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      { odooOrders?.data.length ? (
        <ProductionOrdersTable odooOrders={odooOrders}/>
      ) : (
      <div className="text-center block p-6 bg-white border border-gray-200 rounded-lg shadow bg-gray-100">
        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">No hay órdenes asignadas</h5>
        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">Usted no tiene ninguna orden de produccion asignada.</p>
      </div>
      )}
    </div>
  );
}
