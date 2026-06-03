import Link from 'next/link';

export default function GuestPortalLoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white shadow rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Portal de Invitados</h1>
        <p className="text-sm text-slate-600 mb-6">Acceso para supervisores y administradores del portal.</p>
        <form className="space-y-4">
          <input className="w-full border rounded p-2" placeholder="Correo" type="email" />
          <input className="w-full border rounded p-2" placeholder="Clave" type="password" />
          <button className="w-full bg-blue-600 text-white rounded p-2">Ingresar</button>
        </form>
        <Link href="/guest-portal/report" className="block text-center text-sm text-blue-600 mt-4">Ir al formulario público</Link>
      </div>
    </main>
  );
}
