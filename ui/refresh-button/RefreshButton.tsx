"use client";

import { faRotateRight, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname } from "next/navigation";
import { useTheme } from "@/app/context/ThemeContext";

export function RefreshButton() {
  const pathName = usePathname();
  const normalizedPath = pathName.replace(/\/$/, "");
  const shouldShowRefresh = normalizedPath.startsWith("/dashboard/");
  const { theme, toggleTheme } = useTheme();

  if (!shouldShowRefresh) return null;

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sky-950 text-white shadow-sm hover:bg-[#020630]"
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      >
        <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} size="lg" />
      </button>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sky-950 text-white shadow-sm hover:bg-[#020630]"
        title="Actualizar"
        aria-label="Actualizar"
      >
        <FontAwesomeIcon icon={faRotateRight} size="lg" />
      </button>
    </div>
  );
}
