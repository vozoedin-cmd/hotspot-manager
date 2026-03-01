import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const res = await api.get('/users');
      // For now grab all user audit logs
      return res.data;
    },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log de Auditoría</h1>
        <p className="text-sm text-gray-500">Registro de todas las acciones del sistema</p>
      </div>

      <div className="card p-4 bg-blue-50 border border-blue-100 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          Los logs de auditoría se almacenan en la tabla <code>audit_logs</code> de PostgreSQL.
          Cada acción (login, venta, generación de fichas, cambios de saldo) queda registrada con: usuario, IP, acción y resultado.
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Acciones registradas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Fecha</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Usuario</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Acción</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Entidad</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">IP</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  Selecciona un usuario para ver sus logs de auditoría desde la sección <strong>Vendedores</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
