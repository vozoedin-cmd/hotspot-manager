import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../services/api';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

const statusColors = {
  available: 'badge-info',
  sold: 'badge-warning',
  active: 'badge-success',
  used: 'badge-secondary',
  expired: 'badge-danger',
};

export default function SalesHistoryPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['my-sales', page],
    queryFn: () => salesApi.list({ page, limit: LIMIT }).then((r) => r.data),
    keepPreviousData: true,
  });

  const sales = data?.data ?? data?.sales ?? data?.rows ?? [];
  const total = data?.pagination?.total ?? data?.total ?? data?.count ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Ventas</h1>
        <p className="text-sm text-gray-500">{total} ventas en total</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
          <Receipt className="w-12 h-12 opacity-30" />
          <p>No hay ventas registradas aún</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {sales.map((sale) => (
              <li key={sale.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {sale.voucher?.package?.name ?? 'Paquete'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sale.client_name || '—'} · {format(new Date(sale.created_at || sale.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      Ficha: {sale.voucher?.code ?? '—'}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-bold text-green-600">Q{Number(sale.amount).toFixed(2)}</span>
                    {sale.voucher?.status && (
                      <span className={`badge ${statusColors[sale.voucher.status] ?? 'badge-secondary'}`}>
                        {sale.voucher.status}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
