import type { Metadata } from 'next'
import Image from "next/image";

// Ui Components
import { BreadcrumbsBar } from '@/ui/breadcrumbs-bar/breadcrumbs-bar';

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
          <div className="flex flex-col justify-center items-center lg:px-8 lg:py-8 mx-auto max-w-7xl ">
            <div>
              <div className="bg-white rounded-lg p-3">
                <Image src="/logo.png" width={235} height={60} alt="Logo" />
              </div>
            </div>
            <div className="self-end absolute ">
              <Image src="/menu.png" width={80} height={25} alt="Menu" />
            </div>
          </div>
        <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
          {/* <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
            <BreadcrumbsBar />
          </div> */}
          <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
            <div className="rounded-lg p-3.5 lg:p-6">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
