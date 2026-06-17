"use client";
import { navItems } from "@/config/nav-links";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function roleCanSeeItem(itemRoles: string[] = [], userRole: string = "") {
  const normalizedUserRole = userRole.toString().trim();
  return itemRoles.some((role) => role.toString().trim() === normalizedUserRole);
}

export function HeaderLink({ userRole }: any) {
  const pathName = usePathname();
  const normalizedPath = pathName.replace(/\/$/, "");
  const shouldShowHeader = normalizedPath.startsWith("/dashboard/");

  return (
    shouldShowHeader && (
      <div className="mx-auto max-w-7xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
        <div className="bg-white rounded-lg p-px shadow-lg shadow-black/20">
          <div className="rounded-lg p-3.5 lg:p-6 flex flex-wrap">
            <div className="px-3">
              <Image src="/logo-page.png" width={50} height={50} alt="Logo" />
            </div>
            {navItems.map((section) => (
              <div key={section.name} className="my-2">
                <div className="flex flex-wrap space-x-4 my-2">
                  <div className="ml-3 mt-2">
                    <Link
                      href={`/dashboard`}
                      className={`group block space-y-1.5 rounded-lg px-2 py-2 
                    ${
                      pathName === "/dashboard"
                        ? "bg-lightCyan"
                        : "bg-lightCyan"
                    } hover:bg-sky-950`}
                    >
                      <div className="font-medium group-hover:text-gray-50">
                        Inicio
                      </div>
                    </Link>
                  </div>

                  {section.items.map((item) =>
                    roleCanSeeItem(item.role, userRole) ? (
                      <Link
                        href={`/dashboard/${item.slug}`}
                        key={item.name}
                        className={`mt-2 group block rounded-lg px-2 py-2 ${
                          pathName === `/dashboard/${item.slug}`
                            ? "bg-sky-950 text-gray-50"
                            : "bg-lightCyan"
                        } hover:bg-sky-950`}
                      >
                        <div className="font-medium group-hover:text-gray-50">
                          {item.name}
                        </div>
                      </Link>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  );
}
