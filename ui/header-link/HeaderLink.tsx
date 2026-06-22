"use client";
import { navItems } from "@/config/nav-links";
import { usePathname } from "next/navigation";
import Link from "next/link";

function roleCanSeeItem(itemRoles: string[] = [], userRole: string = "") {
  const normalizedUserRole = userRole.toString().trim();
  return itemRoles.some((role) => role.toString().trim() === normalizedUserRole);
}

export function HeaderLink({ userRole }: any) {
  const pathName = usePathname();
  const normalizedPath = pathName.replace(/\/$/, "");
  const shouldShowHeader = normalizedPath.startsWith("/dashboard");

  return (
    shouldShowHeader && (
      <div className="rounded-md bg-white dark:bg-gray-800 p-3 shadow-sm">
        {navItems.map((section) => (
          <div key={section.name} className="space-y-2">
            <div className="px-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              {section.name}
            </div>
            <div className="space-y-2">
              {section.items.map((item) =>
                roleCanSeeItem(item.role, userRole) ? (
                  <Link
                    href={`/dashboard/${item.slug}`}
                    key={item.name}
                    className={`block rounded-md px-3 py-2 text-sm font-semibold ${
                      normalizedPath === `/dashboard/${item.slug}`
                        ? "bg-sky-950 text-white"
                        : "bg-lightCyan text-gray-900 hover:bg-sky-950 hover:text-white dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-sky-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>
    )
  );
}
