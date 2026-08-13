import { HeaderLink } from '@/ui/header-link/HeaderLink';
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { config } from '@/auth'
import { getCompanyByID } from '@/app/api/companies/companies'

// Config
import { LOGIN_URL } from '@/config/constants'

// Ui Components
import { LogoMenu } from '@/ui/logo-menu/LogoMenu';
import { RefreshButton } from '@/ui/refresh-button/RefreshButton';


export const metadata: Metadata = {
  title: 'Chronos Piso App Dashboard',
  description: '',
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeCompanyIdentity(value?: string | null) {
  return value?.toString().trim().toLowerCase() || "";
}

function isHidrosumiCompany(company: any, companyId?: string | null) {
  const values = [
    companyId,
    company?.id_company,
    company?.name,
    company?.domain,
    company?.database,
  ].map(normalizeCompanyIdentity);

  return values.some((value) => value.includes("hidrosumi"));
}

async function getDashboardCompany(companyId: string) {
  try {
    return await getCompanyByID(companyId);
  } catch (error) {
    console.error("No se pudo resolver la compania del dashboard:", error);
    return null;
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {

  const session = await getServerSession(config)
  if (!session) redirect(LOGIN_URL)
  if (!session.user?.company_id || !session.user?.role || session.user.role === 'chronosAdmin') redirect(LOGIN_URL)
  const company = await getDashboardCompany(session.user.company_id);
  const useHidrosumiLogo = isHidrosumiCompany(company, session.user.company_id);
  const isCompanyAdmin = session.user.role === 'Jefe'
    && Boolean(company?.admin_user_code)
    && company.admin_user_code.toString().trim() === session.user.document?.toString?.().trim?.();

  return (
    <div className="min-h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <div className="flex min-h-screen flex-col gap-4 p-3 lg:flex-row lg:p-5">
        <aside className="w-full shrink-0 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-64 lg:flex lg:flex-col">
          <div className="space-y-4 flex-1">
            <LogoMenu
              userName={session.user.name}
              userRole={session.user.role}
              isDashboardRoute={true}
              logoSrc={useHidrosumiLogo ? "/logo-hidrosumi.png" : "/logo.png"}
              logoAlt={useHidrosumiLogo ? "Logo Hidrosumi" : "Logo Chronos"}
            />
            <HeaderLink userRole={session.user.role} isCompanyAdmin={isCompanyAdmin}></HeaderLink>
          </div>
          <div className="mt-4 px-1 text-center text-[10px] leading-tight text-gray-400 dark:text-gray-500">
            © 2026 Chronos Producción Software<br />versión 1.5
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-2.5rem)] rounded-md bg-white dark:bg-gray-900 p-px shadow-lg shadow-black/20">
            <div className="flex min-h-[calc(100vh-2.75rem)] flex-col rounded-md p-3.5 lg:p-5">
              <RefreshButton />
              <div className="mt-3 min-h-0 flex-1">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
