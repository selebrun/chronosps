import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { config } from '@/auth'

// Config
import { LOGIN_URL } from '@/config/constants'
import { DASHBOARD_URL } from '@/config/constants'

// Ui Components
import { LogoMenu } from '@/ui/logo-menu/LogoMenu';
import React from 'react';


export const metadata: Metadata = {
  title: 'Chronos Piso App Dashboard',
  description: '',
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;  
}) {

  const session = await getServerSession(config)

  if (!session) redirect(LOGIN_URL)

  return (
    <div className="h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <LogoMenu
        userRole={session.user.name}
      />
      <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
        <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
          <div className="rounded-lg p-3.5 lg:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
