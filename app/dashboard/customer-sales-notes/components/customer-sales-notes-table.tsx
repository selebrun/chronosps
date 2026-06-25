"use client"

import { useState } from 'react';
import { getStatusLabel, StatusBadge } from '@/ui/status-badge/status-badge';

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
    <div className="min-w-[110px]">
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

function formatQuantity(value: number) {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

function normalizeSearchText(value: any) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function saleNoteMatchesSearch(sale: any, term: string) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return true;

  const productsText = (sale.products || [])
    .flatMap((product: any) => [
      product?.product,
      product?.description,
      product?.quantity,
      product?.production_count,
      product?.workorder_count,
      product?.progress,
    ])
    .map(normalizeSearchText)
    .join(' ');

  const searchableText = [
    sale?.name,
    sale?.client_order_ref,
    sale?.state,
    getStatusLabel(sale?.state),
    sale?.date_order,
    sale?.partner?.name,
    productsText,
  ].map(normalizeSearchText).join(' ');

  return searchableText.includes(normalizedTerm);
}

export function CustomerSalesNotesTable({ salesNotes }: { salesNotes: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredSalesNotes = (salesNotes || []).filter((sale: any) => saleNoteMatchesSearch(sale, searchTerm));

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por NV, estado, fecha, producto, OP, OT o avance"
          className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 p-3 text-sm text-gray-900 shadow-sm focus:border-sky-950 dark:focus:border-sky-400 focus:outline-none"
        />
      </div>
      <div className="relative max-h-[calc(100vh-13.5rem)] min-h-[calc(100vh-13.5rem)] max-w-full overflow-x-auto overflow-y-auto rounded">
        <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
          <thead className="text-xs text-black uppercase dark:text-black bg-strongCyan border-b-8 border-white sticky top-0">
            <tr>
              <th scope="col" className="px-3 py-2">Nota de venta</th>
              <th scope="col" className="px-3 py-2">Estado</th>
              <th scope="col" className="px-3 py-2">Fecha</th>
              <th scope="col" className="px-3 py-2">Producto</th>
              <th scope="col" className="px-3 py-2">Cantidad NV</th>
              <th scope="col" className="px-3 py-2">OP</th>
              <th scope="col" className="px-3 py-2">OT</th>
              <th scope="col" className="px-3 py-2">Avance</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalesNotes.map((sale: any) => {
              const products = sale.products?.length ? sale.products : [null];

              return products.map((product: any, index: number) => (
                <tr
                  key={`${sale.id}-${product?.id || 'empty'}`}
                  className={`${index === 0 ? 'border-t-8' : 'border-t'} border-white bg-lightCyan text-gray-700`}
                >
                  {index === 0 && (
                    <>
                      <th scope="row" rowSpan={products.length} className="px-3 py-2 align-top font-medium text-black">
                        <div className="space-y-1">
                          <div className="text-sm text-black">{sale.name}</div>
                          {sale.client_order_ref && (
                            <div className="text-xs font-normal text-gray-600">{sale.client_order_ref}</div>
                          )}
                        </div>
                      </th>
                      <td rowSpan={products.length} className="px-3 py-2 align-top">
                        <StatusBadge status={sale.state} />
                      </td>
                      <td rowSpan={products.length} className="px-3 py-2 align-top text-black">
                        {formatDate(sale.date_order)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-black">
                    <div className="max-w-[240px] whitespace-normal font-medium">{product?.product || 'Sin producto asociado'}</div>
                    {product?.description && product.description !== product.product && (
                      <div className="max-w-[240px] whitespace-normal text-xs text-gray-600">{product.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-black">{product ? formatQuantity(product.quantity) : '-'}</td>
                  <td className="px-3 py-2 text-black">{product?.production_count || 0}</td>
                  <td className="px-3 py-2 text-black">{product?.workorder_count || 0}</td>
                  <td className="px-3 py-2">
                    <ProgressBar value={product ? product.progress : 0} />
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
        {filteredSalesNotes.length === 0 && (
          <div className="mt-10 w-full text-center text-xl text-gray-700">
            No se encontraron notas de venta
          </div>
        )}
      </div>
    </>
  );
}
