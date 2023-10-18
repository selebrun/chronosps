"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";

function LogoMenu() {
  const pathName = usePathname();
  const isDashboardRoute = pathName === '/dashboard';
 
  return (
    <>
      {isDashboardRoute && 
        <div className="flex flex-col justify-center items-center lg:px-8 lg:py-8 mx-auto max-w-7xl">
          <div>
            <div className="bg-white rounded-lg p-3">
              <Image src="/logo.png" width={235} height={60} alt="Logo" />
            </div>
          </div>
          <div className="self-end absolute ">
            <Image src="/menu.png" width={80} height={25} alt="Menu" />
          </div>
        </div>
      }
    </>
  );
}

export default LogoMenu;
