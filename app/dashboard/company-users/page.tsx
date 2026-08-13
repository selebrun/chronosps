import Link from 'next/link';
import { getUsersByCompany } from '@/app/api/users/users';
import { requireCompanyUserAdministrator } from './company-user-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const { companyId, company } = await requireCompanyUserAdministrator();
  const users = await getUsersByCompany(companyId);
  const administratorCode = company?.admin_user_code?.toString?.().trim?.() || '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Usuarios de la empresa</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{company?.name?.toString?.().trim?.()}</p>
        </div>
        <Link href="/dashboard/company-users/create" className="rounded-md bg-sky-950 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800">
          Crear usuario
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-strongCyan text-xs uppercase text-gray-900 dark:bg-sky-900 dark:text-gray-100">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Identificacion</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => {
              const code = user?.code?.toString?.().trim?.() || '';
              const isAdministrator = code === administratorCode;
              return (
                <tr key={`${companyId}-${code}`} className="border-t border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  <td className="px-4 py-3 font-medium">
                    {user?.name?.toString?.().trim?.()}
                    {isAdministrator && <span className="ml-2 rounded bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900">Administrador</span>}
                  </td>
                  <td className="px-4 py-3">{code}</td>
                  <td className="px-4 py-3">{user?.rol?.toString?.().trim?.()}</td>
                  <td className="px-4 py-3">{user?.email?.toString?.().trim?.()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/company-users/${encodeURIComponent(code)}`} className="rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length && <div className="p-6 text-center text-gray-600 dark:text-gray-300">No hay usuarios registrados en la empresa.</div>}
      </div>
    </div>
  );
}
