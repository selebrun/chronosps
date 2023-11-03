export function StatusBadge({ status }: { status: string }) {

  const STATUS_DICT: Record<string, { name: string; color: string }> = {
    progress: { name: "En progreso", color: "bg-yellow-100 text-yellow-800" },
    completed: { name: "Completado", color: "bg-green-400 text-white" },
    waiting: { name: "En espera", color: "bg-gray-400 text-black" },
    pending: { name: "Pendiente", color: "bg-orange-400 text-white" },
    confirmed: { name: "Confirmado", color: "bg-purple-200 text-purple-800" },
  };

  const statusInfo = STATUS_DICT[status] || { name: {status}, color: "bg-gray-400 text-black" };

  return (
    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded whitespace-nowrap ${statusInfo.color}`}>
      {statusInfo.name}
    </span>
  )
}
