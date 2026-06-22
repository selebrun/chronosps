"use client";

import { faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname } from "next/navigation";

export function RefreshButton() {
  const pathName = usePathname();
  const normalizedPath = pathName.replace(/\/$/, "");
  const shouldShowRefresh = normalizedPath.startsWith("/dashboard/");

  if (!shouldShowRefresh) return null;

  return (
    <div className="flex justify-end">
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
