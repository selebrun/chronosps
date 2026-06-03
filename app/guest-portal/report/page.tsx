'use client';

import { FormEvent, useEffect, useState } from 'react';

const DEFAULT_COMPANY_ID = '1';

export default function GuestPortalReportPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/guest-portal/assets?companyId=${DEFAULT_COMPANY_ID}`)
      .then((r) => r.json())
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      companyId: DEFAULT_COMPANY_ID,
      assetId: String(formData.get('assetId') || ''),
      templateId: 'default',
      reporterName: String(formData.get('reporterName') || ''),
      reporterEmail: String(formData.get('reporterEmail') || ''),
      hasFailure: formData.get('hasFailure') === 'on',
      requireSupervisorApproval: true,
      answers: {
        observations: String(formData.get('observations') || ''),
      },
    };

    const response = await fetch('/api/guest-portal/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || 'No se pudo enviar el checklist.');
      setLoading(false);
      return;
    }

    setMessage('Checklist enviado correctamente. Queda pendiente de aprobación de supervisor.');
    event.currentTarget.reset();
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Reporte de checklist rodante</h1>
      <p className="text-slate-600 mb-6">Este portal permite reportar incidencias sin usuario Fracttal.</p>
      <form onSubmit={onSubmit} className="grid gap-3 bg-white p-6 rounded shadow">
        <input name="reporterName" placeholder="Nombre" className="border p-2 rounded" required />
        <input name="reporterEmail" placeholder="Email" className="border p-2 rounded" type="email" required />
        <select name="assetId" className="border p-2 rounded" required>
          <option value="">Selecciona un activo</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.code} - {asset.name}</option>
          ))}
        </select>
        <textarea name="observations" placeholder="Observaciones / fallas" className="border p-2 rounded" rows={5} required />
        <label className="flex gap-2 text-sm"><input name="hasFailure" type="checkbox" /> Se detectó una falla</label>
        <button disabled={loading} type="submit" className="bg-blue-700 text-white rounded p-2 disabled:opacity-50">
          {loading ? 'Enviando...' : 'Enviar checklist'}
        </button>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </form>
    </main>
  );
}
