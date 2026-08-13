import 'server-only';

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { config } from '@/auth';
import { getCompanyByID, isCompanyAdministrator } from '@/app/api/companies/companies';

export async function requireCompanyUserAdministrator() {
  const session = await getServerSession(config);
  if (!session?.user?.company_id) redirect('/login');

  const authorized = await isCompanyAdministrator(session.user);
  if (!authorized) redirect('/dashboard');

  const companyId = session.user.company_id.toString().trim();
  const company = await getCompanyByID(companyId);
  return { session, companyId, company };
}
