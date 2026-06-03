import { getCustomerSalesNotes } from '@/app/api/orders/getOrders';
import { getServerSession } from 'next-auth';
import { config } from '@/auth';
import { redirect } from 'next/navigation';
import { CustomerSalesNotesTable } from './components/customer-sales-notes-table';

export default async function Page() {
  const session = await getServerSession(config);
  const user = session.user;

  if (!['Cliente', 'Jefe'].includes(user.role)) redirect('/dashboard');

  const salesNotes: any = await getCustomerSalesNotes(user)
    .then((res) => res)
    .catch((err) => {
      console.log(err);
      return { status: false, message: 'No se pudo consultar las notas de venta.', data: [] };
    });

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      {salesNotes?.data?.length ? (
        <CustomerSalesNotesTable salesNotes={salesNotes.data} />
      ) : (
        <div className="text-center block p-6 bg-white border border-gray-200 rounded-lg shadow bg-gray-100">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">No hay notas de venta</h5>
          <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
            {salesNotes?.message || 'No se encontraron notas de venta asociadas a su usuario.'}
          </p>
        </div>
      )}
    </div>
  );
}
