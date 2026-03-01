import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { vouchersApi, packagesApi, mikrotikApi } from '../../services/api';
import { Plus, Search, Filter, RefreshCw, Ban, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_LABELS = {
  available: { label: 'Disponible', cls: 'badge-available' },
  sold: { label: 'Vendida', cls: 'badge-sold' },
  active: { label: 'Activa', cls: 'badge-active' },
  used: { label: 'Usada', cls: 'badge-used' },
  expired: { label: 'Expirada', cls: 'badge-expired' },
  disabled: { label: 'Deshabilitada', cls: 'badge-disabled' },
};

export default function VouchersPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', package_id: '', device_id: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['vouchers', filters],
    queryFn: () => vouchersApi.list(filters).then(r => r.data),
  });

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list({ is_active: 'true' }).then(r => r.data.data),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  const disableMutation = useMutation({
    mutationFn: (id) => vouchersApi.disable(id),
    onSuccess: () => {
      qc.invalidateQueries(['vouchers']);
      toast.success('Ficha deshabilitada');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const vouchers = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichas Hotspot</h1>
          <p className="text-sm text-gray-500">Gestiona todas las fichas del sistema</p>
        </div>
        <Link to="/admin/vouchers/generate" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Generar Fichas
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <select
            className="input w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>

          <select
            className="input w-auto"
            value={filters.package_id}
            onChange={(e) => setFilters({ ...filters, package_id: e.target.value, page: 1 })}
          >
            <option value="">Todos los paquetes</option>
            {packages?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            className="input w-auto"
            value={filters.device_id}
            onChange={(e) => setFilters({ ...filters, device_id: e.target.value, page: 1 })}
          >
            <option value="">Todos los routers</option>
            {devices?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <button
            onClick={() => setFilters({ status: '', package_id: '', device_id: '', page: 1 })}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>
        {pagination.total !== undefined && (
          <p className="text-xs text-gray-400 mt-2">{pagination.total} fichas encontradas</p>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Paquete</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Router</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array(10).fill().map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill().map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-12">
                    No hay fichas con los filtros aplicados
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const st = STATUS_LABELS[v.status] || { label: v.status, cls: 'badge-used' };
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono font-semibold text-gray-800">
                          {v.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{v.package?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={st.cls}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{v.device?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{v.seller?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {format(new Date(v.created_at), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {v.status === 'available' && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Deshabilitar ficha ${v.code}?`)) {
                                disableMutation.mutate(v.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            title="Deshabilitar"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Página {pagination.page} de {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-xs py-1 px-3"
                disabled={pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </button>
              <button
                className="btn-secondary text-xs py-1 px-3"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
