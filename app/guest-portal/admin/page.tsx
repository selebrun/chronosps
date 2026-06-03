export default function GuestPortalAdminPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Administración Portal Externo</h1>
      <ul className="list-disc ml-5 mt-4 text-slate-700">
        <li>Gestión de usuarios del portal (supervisores y operadores).</li>
        <li>Configuración dinámica de campos por tipo de activo rodante.</li>
        <li>Aprobación de checklist antes de ejecutar acciones.</li>
        <li>Creación opcional de solicitud de trabajo en Fracttal al detectar fallas.</li>
      </ul>
    </main>
  );
}
