import type { Metadata } from 'next'
import { ChronosAdminSideMenu } from "@/ui/admin/side-menu";
import { Suspense } from "react";

// Ui Components
import { LogoMenu } from '@/ui/logo-menu/LogoMenu';
import React from 'react';


export const metadata: Metadata = {
  title: 'Chronos Piso App Dashboard',
  description: '',
}

/**
 * Componente AdminLayout
 * 
 * Este componente sirve como el layout para todas las rutas de administrador en la aplicación Chronos Piso.
 * Incluye la barra donde esta el logo y el menu de navegación y usuario.
 * 
 * Importante: NO SERA NECESARIO agregar el header o menu dentro de las rutas de Admin
 * ya que este Layout es global para todas las rutas hijas dentro de esta carpeta
 */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <LogoMenu
        userRole={"Administrador"}
        isDashboardRoute
      />

      <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8 bg-white rounded-lg p-px shadow-lg shadow-black/20 p-3.5 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <ChronosAdminSideMenu />
          </div>
          <div className="md:col-span-3 ">
            <Suspense>
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
