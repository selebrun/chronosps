"use client";
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { signOut } from "next-auth/react";



export function LogoMenu({ userRole }: { userRole: string }) {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const pathName = usePathname();
  const isDashboardRoute = pathName === '/dashboard' ||  pathName === '/admin/test';
  const router = useRouter();
  const onShowMenu = (): any => {
    setShowMenu(!showMenu)
  }

  const logout = () => {
    signOut({ redirect: false });
    localStorage.removeItem('admin');
    router.push('/login'); 
  };

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
            <div onClick={() => onShowMenu()}>
              <Image src="/menu.png" width={60} height={10} alt="Menu"/>
            </div>
            {showMenu && 
              <div  className="z-10 p- self-end right-1 absolute bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700">
                {/* <select  id="countries" className=" py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                  <option value="US">United States</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                </select> */}
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                  <li>
                  <FontAwesomeIcon icon={faUser} size="1x" className="ml-2 px-1"/>{userRole}
                  </li>
                  <li>
                    <button className="py-1 px-2 ml-3 rounded-md hover:text-gray-50 y hover:bg-sky-950"onClick={() => logout()}>Cerrar Sessión</button>
                  </li>
                </ul>
            </div>}
          </div>
        </div>
      }
    </>
  );
}