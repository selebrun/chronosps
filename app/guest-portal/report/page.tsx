'use client';

import { useEffect, useState } from 'react';

export default function GuestPortalReportPage() {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/guest-portal/assets?companyId=1').then((r) => r.json()).then(setAssets).catch(() => setAssets([]));
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Reporte de checklist rodante</h1>
      <p className="text-slate-600 mb-6">Este portal permite reportar incidencias sin usuario Fracttal.</p>
      <form className="grid gap-3 bg-white p-6 rounded shadow">
        <input name="reporterName" placeholder="Nombre" className="border p-2 rounded" />
        <input name="reporterEmail" placeholder="Email" className="border p-2 rounded" />
        <select name="assetId" className="border p-2 rounded">
          <option>Selecciona un activo</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} - {asset.name}</option>)}
        </select>
        <textarea name="observations" placeholder="Observaciones / fallas" className="border p-2 rounded" rows={5} />
        <label className="flex gap-2 text-sm"><input type="checkbox" /> Se detectó una falla</label>
        <button type="button" className="bg-blue-700 text-white rounded p-2">Enviar checklist</button>
      </form>
    </main>
  );
}
