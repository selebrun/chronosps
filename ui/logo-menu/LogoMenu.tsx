"use client";

import { faMoon, faSun, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/app/context/ThemeContext";

export function LogoMenu({
  userRole,
  isDashboardRoute,
  isAdminRoute = false,
}: {
  userRole: string;
  isDashboardRoute: boolean;
  isAdminRoute?: boolean;
}) {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const { theme, toggleTheme } = useTheme();

  const logout = async () => {
    if (isAdminRoute) {
      await fetch("/api/admin-auth/logout", { method: "POST" });
      window.location.assign("/admin/login");
      return;
    }

    await signOut({ redirect: false, callbackUrl: "/login" });
    await fetch("/api/session/clear-nextauth", { method: "POST" });
    localStorage.removeItem("admin");
    window.location.assign("/login");
  };

  if (!isDashboardRoute) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-white dark:bg-gray-800 p-3 shadow-sm flex items-center justify-between gap-2">
        <Image src="/logo.png" width={195} height={60} alt="Logo" className="h-auto w-auto flex-1 min-w-0" />
        <button
          type="button"
          onClick={toggleTheme}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} size="lg" />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu((current) => !current)}
          className="flex w-full items-center justify-between rounded-md bg-lightCyan dark:bg-gray-700 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-sky-950 hover:text-white dark:hover:bg-sky-900"
        >
          <span>Usuario</span>
          <Image src="/menu.png" width={38} height={8} alt="Menu" />
        </button>

        {showMenu && (
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-md bg-white dark:bg-gray-700 shadow">
            <ul className="p-2 text-sm text-gray-700 dark:text-gray-200">
              <li className="flex items-center gap-2 rounded-md px-2 py-1">
                <FontAwesomeIcon icon={faUser} size="1x" />
                <span className="truncate">{userRole}</span>
              </li>
              <li>
                <button
                  type="button"
                  className="mt-2 w-full rounded-md px-2 py-1 text-left hover:bg-sky-950 hover:text-gray-50"
                  onClick={logout}
                >
                  Cerrar sesion
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
