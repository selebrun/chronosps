"use client";
import { navItems } from '@/config/nav-links';
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';

export function HeaderLink({ userRole }: any) {
  const pathName = usePathname();
  const isDashboardRoute = pathName.startsWith('/dashboard/')

  return (
   isDashboardRoute && 
    <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
      <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
        <div className="rounded-lg p-3.5 lg:p-6 flex">
          <div> <Image src="/logo-page.png" width={50} height={50} alt="lLogo" /></div>
          <div className="space-x-4 ml-10 mr-4">
            <div className="space-x-4">
              <Link
                href={`/dashboard`}
                className="group block space-y-1.5 rounded-lg bg-lightCyan px-2 py-2 hover:bg-sky-950"
              >
                <div className="font-medium group-hover:text-gray-50">
                  Inicio
                </div>
              </Link>
            </div>
          </div>
          {navItems.map((section) => {
              return (
                <div key={section.name} className="space-y-5 ">
                  <div className="flex space-x-4">
                    {section.items.map((item) => {
                      return (
                        item.role.includes(userRole) && <Link
                          href={`/dashboard/${item.slug}`}
                          key={item.name}
                          className="group block space-y-1.5 rounded-lg bg-lightCyan px-2 py-2 hover:bg-sky-950"
                        >
                          <div className="font-medium group-hover:text-gray-50">
                            {item.name}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

