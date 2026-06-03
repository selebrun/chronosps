"use client";

import { StatusBadge } from '@/ui/status-badge/status-badge';

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(value || 0, 100))}%`;
}

function formatDate(value: string) {
  if (!value) return '-';
  return value.split(' ')[0];
}

function progressColor(value: number) {
  if (value >= 80) return 'bg-[#2FD28E]';
  if (value >= 40) return 'bg-yellow-400';
  return 'bg-orange-400';
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs text-gray-700">
        <span>Avance</span>
        <span className="font-semibold">{formatPercent(value)}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-gray-200">
        <div className={`h-2 rounded ${progressColor(value)}`} style={{ width: formatPercent(value) }} />
      </div>
    </div>
  );
}

export function CustomerSalesNotesTable({ salesNotes }: { salesNotes: any[] }) {
  return (
    <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
        <thead className="text-xs text-black uppercase dark:text-black bg-strongCyan border-b-8 border-white sticky top-0">
          <tr>
            <th scope="col" className="px-6 py-3">Nota de venta</th>
            <th scope="col" className="px-6 py-3">Estado</th>
            <th scope="col" className="px-6 py-3">Fecha</th>
            <th scope="col" className="px-6 py-3">Orden de produccion</th>
            <th scope="col" className="px-6 py-3">Producto</th>
            <th scope="col" className="px-6 py-3">Cantidad</th>
            <th scope="col" className="px-6 py-3">Ordenes de trabajo</th>
            <th scope="col" className="px-6 py-3">Avance promedio</th>
          </tr>
        </thead>
        <tbody>
          {salesNotes.map((sale: any) => {
            const productions = sale.productions?.length ? sale.productions : [null];

            return productions.map((production: any, index: number) => (
              <tr
                key={`${sale.id}-${production?.id || 'empty'}`}
                className={`${index === 0 ? 'border-t-8' : 'border-t'} border-white bg-lightCyan text-gray-700`}
              >
                {index === 0 && (
                  <>
                    <th scope="row" rowSpan={productions.length} className="px-5 py-3 align-top font-medium text-black">
                      <div className="space-y-1">
                        <div className="text-sm text-black">{sale.name}</div>
                        {sale.client_order_ref && (
                          <div className="text-xs font-normal text-gray-600">{sale.client_order_ref}</div>
                        )}
                      </div>
                    </th>
                    <td rowSpan={productions.length} className="px-3 py-3 align-top">
                      <StatusBadge status={sale.state} />
                    </td>
                    <td rowSpan={productions.length} className="px-3 py-3 align-top text-black">
                      {formatDate(sale.date_order)}
                    </td>
                  </>
                )}
                <td className="px-3 py-3 text-black">{production?.name || 'Sin orden asociada'}</td>
                <td className="px-3 py-3 text-black">{production?.product || '-'}</td>
                <td className="px-3 py-3 text-black">
                  {production ? `${production.qty_producing || 0}/${production.product_qty || 0}` : '-'}
                </td>
                <td className="px-3 py-3 text-black">{production?.workorder_count || 0}</td>
                <td className="px-3 py-3">
                  <ProgressBar value={production ? production.progress : sale.progress} />
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
