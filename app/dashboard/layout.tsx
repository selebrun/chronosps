import { HeaderLink } from '@/ui/header-link/HeaderLink';
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { config } from '@/auth'

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

export default async function Layout({
  children,
}: {
  children: React.ReactNode;  
}) {

  const session = await getServerSession(config)
  if (!session) redirect(LOGIN_URL)
  if (!session.user?.company_id || !session.user?.role || session.user.role === 'chronosAdmin') redirect(LOGIN_URL)

  return (
    <div className="min-h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <div className="flex min-h-screen flex-col gap-4 p-3 lg:flex-row lg:p-5">
        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-64">
          <LogoMenu
            userRole={session.user.name}
            isDashboardRoute={true}
          />
          <HeaderLink userRole={session.user.role}></HeaderLink>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-2.5rem)] rounded-md bg-white p-px shadow-lg shadow-black/20">
            <div className="min-h-[calc(100vh-2.75rem)] rounded-md p-3.5 lg:p-5">
              <RefreshButton />
              <div className="mt-3">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
