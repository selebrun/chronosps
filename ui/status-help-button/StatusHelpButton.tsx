"use client"

import { useState } from 'react';
import { Modal } from '@/ui/modal/modal';
import { StatusBadge } from '@/ui/status-badge/status-badge';

const STATUS_HELP: Record<string, Array<{ status: string; description: string }>> = {
  production: [
    { status: 'confirmed', description: 'Orden de produccion confirmada y disponible para planificacion o ejecucion.' },
    { status: 'progress', description: 'Orden de produccion en ejecucion.' },
    { status: 'done', description: 'Orden de produccion finalizada.' },
    { status: 'cancel', description: 'Orden de produccion cancelada.' },
  ],
  workorder: [
    { status: 'pending', description: 'Orden de trabajo pendiente; aun no se puede ejecutar.' },
    { status: 'waiting', description: 'Orden de trabajo en espera de una condicion previa.' },
    { status: 'ready', description: 'Orden de trabajo disponible para iniciar.' },
    { status: 'progress', description: 'Orden de trabajo en ejecucion; el reloj puede estar corriendo.' },
    { status: 'paused', description: 'Orden de trabajo pausada; el reloj debe permanecer detenido.' },
    { status: 'blocked', description: 'Orden bloqueada en Piso; solo un Jefe puede desbloquearla.' },
    { status: 'quality_failed', description: 'Orden con control de calidad fallado; requiere revision de Lider o Jefe.' },
    { status: 'done', description: 'Orden de trabajo terminada.' },
    { status: 'cancel', description: 'Orden de trabajo cancelada.' },
  ],
  quality: [
    { status: 'none', description: 'Control pendiente de revision.' },
    { status: 'pass', description: 'Control aprobado.' },
    { status: 'fail', description: 'Control fallado; la OT asociada requiere revision.' },
    { status: 'confirmed', description: 'Orden de produccion confirmada con controles asociados.' },
    { status: 'progress', description: 'Orden de produccion en ejecucion con controles asociados.' },
    { status: 'done', description: 'Orden de produccion finalizada.' },
  ],
};

export function StatusHelpButton({ module }: { module: keyof typeof STATUS_HELP }) {
  const [isOpen, setIsOpen] = useState(false);
  const statuses = STATUS_HELP[module] || [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Ver significado de estados"
        aria-label="Ver significado de estados"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-lg font-bold text-sky-950 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-950 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        ?
      </button>

      <Modal
        setOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Significado de estados"
        className="max-w-2xl"
      >
        <div className="mt-4 space-y-3">
          {statuses.map((item) => (
            <div key={item.status} className="grid gap-3 rounded-md border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200 sm:grid-cols-[150px_1fr]">
              <div>
                <StatusBadge status={item.status} />
              </div>
              <div>{item.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-right">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md bg-sky-950 px-4 py-2 text-sm font-semibold text-white hover:bg-[#020630]"
          >
            Aceptar
          </button>
        </div>
      </Modal>
    </>
  );
}
