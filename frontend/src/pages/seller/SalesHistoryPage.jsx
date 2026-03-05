import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../services/api';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Receipt, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../../utils/exportUtils';

const statusLabels = {
  available: 'Disponible',
  sold: 'Vendida',
  active: 'Activa',
  used: 'Usada',
  expired: 'Vencida',
  disabled: 'Desactivada',
};

const statusColors = {
  available: 'bg-blue-100 text-blue-700',
  sold: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  used: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
  disabled: 'bg-gray-100 text-gray-400',
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
  const totalRevenue = sales.reduce((s, x) => s + Number(x.amount || 0), 0);

  const handleExport = () => {
    const rows = sales.map((s) => ({
      Fecha: format(new Date(s.created_at || s.createdAt), 'dd/MM/yyyy HH:mm'),
      Cliente: s.client_name || 'Sin nombre',
      Paquete: s.package?.name ?? s.voucher?.package?.name ?? '—',
      Ficha: s.voucher?.code ?? '—',
      'Monto (Q)': Number(s.amount).toFixed(2),
      Estado: s.voucher?.status ?? '—',
    }));
    exportToExcel(rows, Object.keys(rows[0] ?? {}), 'mis_ventas', 'Ventas');
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Ventas</h1>
          <p className="text-sm text-gray-500">{total} ventas en total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-gray-400">Esta página</p>
            <p className="text-sm font-bold text-green-600">Q{totalRevenue.toFixed(2)}</p>
          </div>
          {sales.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
              title="Exportar a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
          )}
        </div>
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
                      {sale.package?.name ?? sale.voucher?.package?.name ?? 'Paquete'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sale.client_name || 'Sin nombre'} · {format(new Date(sale.created_at || sale.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                      {sale.voucher?.code ?? '—'}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-bold text-green-600">Q{Number(sale.amount).toFixed(2)}</span>
                    {sale.voucher?.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sale.voucher.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {statusLabels[sale.voucher.status] ?? sale.voucher.status}
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
