import type { Metadata } from 'next'
import Image from "next/image";

// Ui Components
import { LogoMenu } from '../../ui/logo-menu/LogoMenu';

export const metadata: Metadata = {
  title: 'Chronos Piso App Dashboard',
  description: '',
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;  
}) {
  return (
    <>
      <div className="h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
        <LogoMenu></LogoMenu>
        <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
          <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
            <div className="rounded-lg p-3.5 lg:p-6">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
