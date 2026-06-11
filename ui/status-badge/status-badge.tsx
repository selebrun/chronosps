export function StatusBadge({ status }: { status: string }) {

  const STATUS_DICT: Record<string, { name: string; color: string }> = {
    progress: { name: "En progreso", color: "bg-yellow-100 text-yellow-800" },
    paused: { name: "Pausada", color: "bg-yellow-200 text-yellow-900" },
    completed: { name: "Completado", color: "bg-green-400 text-white" },
    waiting: { name: "En espera", color: "bg-gray-400 text-black" },
    pending: { name: "Pendiente", color: "bg-orange-400 text-white" },
    confirmed: { name: "Confirmado", color: "bg-purple-200 text-purple-800" },
    done: { name: "Terminado", color: "bg-purple-200 text-purple-800" },
    none: { name: "Por realizar", color: "bg-purple-200 text-purple-800" },
    pass: { name: "Aprobado", color: "bg-[#2FD28E] text-purple-800" },
    normal: { name: "Aprobado", color: "bg-[#2FD28E] text-purple-800" },
    ready: { name: "Completado", color: "bg-green-400 text-white" },
    fail: { name: "Fallado", color: "bg-red-500 text-white" },
    draft: { name: "Borrador", color: "bg-gray-200 text-gray-800" },
    sent: { name: "Enviada", color: "bg-blue-100 text-blue-800" },
    sale: { name: "Confirmada", color: "bg-green-100 text-green-800" },
    cancel: { name: "Cancelada", color: "bg-red-100 text-red-800" },
    blocked: { name: "Bloqueada", color: "bg-red-600 text-white" },
  };

  const statusInfo = STATUS_DICT[status] || { name: status || "Sin estado", color: "bg-gray-400 text-black" };

  return (
    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded whitespace-nowrap ${statusInfo.color}`}>
      {statusInfo.name}
    </span>
  )
}
