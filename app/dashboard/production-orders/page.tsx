import { getWorkOrders, getBlockReasons } from '@/app/api/orders/getOrders'
import { getServerSession } from 'next-auth'
import { config } from '@/auth';
import { redirect } from 'next/navigation';


// UI Components
import { ProductionOrdersTable } from '@/app/dashboard/production-orders/components/production-orders-table';

export default async function Page() {
  const session = await getServerSession(config);
  if (!session?.user) redirect('/login');
  const user = session.user;
  if (user.role === 'Calidad') redirect('/dashboard/quality-control');
  const [odooOrdersWork, blockReasons]: any[] = await Promise.all([
    getWorkOrders(user).catch((err) => {
      console.error('Error consultando ordenes de trabajo para OP:', err);
      return { status: false, message: err?.message || 'No se pudieron consultar las ordenes de trabajo.', data: [], production_data: [] };
    }),
    getBlockReasons(user).catch((err) => {
      console.error('Error consultando motivos de bloqueo:', err);
      return { status: false, block_reasons: [] };
    }),
  ]);
  const odooOrders = {
    status: Boolean(odooOrdersWork?.status),
    message: odooOrdersWork?.message || '',
    data: Array.isArray(odooOrdersWork?.production_data) ? odooOrdersWork.production_data : [],
  };

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Ordenes de produccion</h1>
      {!odooOrders.status ? (
        <div className="block rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-800">
          <h5 className="mb-2 text-xl font-bold">No se pudo cargar el listado de OP</h5>
          <p className="mb-0 font-normal">{odooOrders.message || 'No se pudieron consultar las ordenes de produccion.'}</p>
        </div>
      ) : odooOrders.data.length ? (
        <ProductionOrdersTable odooOrders={odooOrders} ordersWork={odooOrdersWork} user={user} blockReasons={blockReasons} />
      ) : (
      <div className="text-center block p-6 bg-white border border-gray-200 rounded-lg shadow bg-gray-100">
        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">No hay órdenes asignadas</h5>
        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">Usted no tiene ninguna orden de produccion asignada.</p>
      </div>
      )}
    </div>
  );
}
