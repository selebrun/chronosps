import { getQualityControl } from '@/app/api/orders/getOrders'
import { getServerSession } from 'next-auth'
import { config } from '@/auth';
import { redirect } from 'next/navigation';
import { QualityOrdersTable } from './components/quality-orders-table';

export default async function Page() {
  const session = await getServerSession(config);
  if (!session?.user) redirect('/login');
  const user = session.user;
  const odooOrders: any = await getQualityControl(user)
    .then((res) => res)
    .catch((err) => {
      console.error('Error consultando controles de calidad:', err);
      return { status: false, message: 'No se pudieron consultar los controles de calidad.', data: [], production_data: [] };
    });

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Controles de calidad</h1>
      {odooOrders?.production_data?.length ? (
         <QualityOrdersTable odooOrders={odooOrders} user={user} />
      ) : (
      <div className="text-center block p-6 bg-white border border-gray-200 rounded-lg shadow bg-gray-100">
        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">No hay órdenes asignadas</h5>
        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">Usted no tiene ninguna orden de produccion asignada.</p>
      </div>
      )}
    </div>
  );
}

