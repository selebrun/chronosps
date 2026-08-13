import { getUsers, getUsersByCompany } from "@/app/api/users/users";
import { getCompanies } from "@/app/api/companies/companies";
import Link from "next/link";

export default async function Page({ searchParams }: { searchParams?: { company?: string } }) {
  const selectedCompany = searchParams?.company?.toString?.().trim?.() || '';
  const [users, companies] = await Promise.all([
    selectedCompany ? getUsersByCompany(selectedCompany) : getUsers(),
    getCompanies(),
  ]);
  const companyNames = new Map(
    companies.map((company: any) => [
      company.id_company?.toString?.().trim?.() || '',
      company.name?.toString?.().trim?.() || 'Sin nombre',
    ])
  );

  return (
    <div className="md:col-span-3 w-full">

      <div className="flex justify-between items-center border-b-2 pb-4">
        <h6 className="font-bold">Usuarios</h6>
        <Link href={"users/create"} className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600">Crear usuario</Link>
      </div>

      <form action="/admin/users" method="get" className="my-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="company" className="mb-1 block text-xs font-bold text-gray-700">Empresa</label>
          <select id="company" name="company" defaultValue={selectedCompany} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900">
            <option value="">Todas las empresas</option>
            {companies.map((company: any) => {
              const companyId = company.id_company?.toString?.().trim?.() || '';
              return <option value={companyId} key={companyId}>{company.name?.toString?.().trim?.()}</option>;
            })}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-sky-950 px-4 py-2 font-semibold text-white hover:bg-sky-800">Filtrar</button>
        {selectedCompany && <Link href="/admin/users" className="rounded-md bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300">Limpiar</Link>}
      </form>

      <div className="max-h-[52vh] overflow-x-auto overflow-y-auto rounded-md border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-100 text-xs uppercase text-gray-700">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => {
              const companyId = user.id_company?.toString?.().trim?.() || '';
              const code = user.code?.toString?.().trim?.() || '';
              const returnPath = selectedCompany ? `/admin/users?company=${encodeURIComponent(selectedCompany)}` : '/admin/users';
              return (
                <tr key={`${companyId}-${code}`} className="border-t border-gray-200 bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name?.toString?.().trim?.()}</td>
                  <td className="px-4 py-3 text-gray-700">{companyNames.get(companyId) || companyId}</td>
                  <td className="px-4 py-3 text-gray-700">{user.rol?.toString?.().trim?.()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${encodeURIComponent(code)}?company=${encodeURIComponent(companyId)}&returnTo=${encodeURIComponent(returnPath)}`}
                      className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length && <div className="p-6 text-center text-gray-600">No hay usuarios para la empresa seleccionada.</div>}
      </div>

    </div>
  );
}
