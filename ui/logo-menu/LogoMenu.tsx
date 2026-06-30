"use client";

import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { signOut } from "next-auth/react";

export function LogoMenu({
  userName,
  userRole,
  isDashboardRoute,
  isAdminRoute = false,
  logoSrc = "/logo.png",
  logoAlt = "Logo",
}: {
  userName: string;
  userRole: string;
  isDashboardRoute: boolean;
  isAdminRoute?: boolean;
  logoSrc?: string;
  logoAlt?: string;
}) {
  const logout = async () => {
    if (isAdminRoute) {
      await fetch("/api/admin-auth/logout", { method: "POST", credentials: "same-origin" });
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
      <div className="rounded-md bg-white dark:bg-gray-800 p-3 shadow-sm">
        <Image src={logoSrc} width={195} height={60} alt={logoAlt} className="h-auto w-auto" />
      </div>

      <div className="rounded-md bg-white dark:bg-gray-800 p-3 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-950 text-white">
            <FontAwesomeIcon icon={faUser} size="sm" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{userName}</div>
            <div className="truncate text-xs text-gray-500 dark:text-gray-400">{userRole}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white hover:bg-[#020630] dark:hover:bg-sky-900"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
