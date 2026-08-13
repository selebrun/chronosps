import Link from 'next/link';
import { ChronosUsersForm } from '@/ui/admin/users/user-form';
import { requireCompanyUserAdministrator } from '../company-user-access';

export default async function Page() {
  const { companyId, company } = await requireCompanyUserAdministrator();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Crear usuario</h1>
        <Link href="/dashboard/company-users" className="rounded-md bg-gray-100 px-4 py-2 text-gray-800 hover:bg-gray-200">Cancelar</Link>
      </div>
      <ChronosUsersForm
        companies={[company]}
        fixedCompanyId={companyId}
        returnPath="/dashboard/company-users"
        companyScope={true}
      />
    </div>
  );
}
