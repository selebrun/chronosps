"use client";
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'


export function ChronosAdminSideMenu({
  title
}: {
  title?: string
}) {

  const router = useRouter();
  const pathname = usePathname();

  const TITLE_DICT: Record<string, string> = {
    "/admin/companies": "Historial de companias",
    "/admin/users": "Historial de usuarios",
  }

  return (
    <>
      <h6 className="font-bold mb-4">{TITLE_DICT[pathname] || "Menu"}</h6>
      <div className="space-y-3 flex flex-col justify-center items-center text-center">
        <button onClick={() => router.push('/admin/users')} className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none">
          Ver Usuarios
        </button>
        <button onClick={() => router.push('/admin/companies')} className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none">
          Ver Compañías
        </button>
      </div>
    </>
  )
}