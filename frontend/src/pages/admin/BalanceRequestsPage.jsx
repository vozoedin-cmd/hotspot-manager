import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersApi } from '../../services/api';
import { CheckCircle, XCircle, Clock, User, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: '', label: 'Todas' },
];

export default function BalanceRequestsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectNotes, setRejectNotes] = useState({});
  const [expandedReject, setExpandedReject] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['balance-requests', activeTab],
    queryFn: () => sellersApi.getBalanceRequests({ status: activeTab || undefined }).then(r => r.data),
  });

  const { mutate: doApprove, isPending: approving } = useMutation({
    mutationFn: (id) => sellersApi.approveRequest(id, {}),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['balance-requests-count'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const { mutate: doReject } = useMutation({
    mutationFn: ({ id, notes }) => sellersApi.rejectRequest(id, { review_notes: notes }),
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      setExpandedReject(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['balance-requests-count'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const requests = data?.data ?? [];
  const total = data?.pagination?.total ?? requests.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Saldo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona las solicitudes de recarga de saldo de los vendedores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === t.id ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No hay solicitudes {activeTab === 'pending' ? 'pendientes' : activeTab === 'approved' ? 'aprobadas' : activeTab === 'rejected' ? 'rechazadas' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{total} solicitud{total !== 1 ? 'es' : ''}</p>
          {requests.map(req => (
            <div key={req.id} className="card p-0 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Seller info */}
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => navigate(`/admin/sellers/${req.seller_id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {req.seller?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 hover:text-blue-600">{req.seller?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{req.seller?.email ?? ''}</p>
                  </div>
                </div>
                {/* Amount */}
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">Q{parseFloat(req.amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{format(new Date(req.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
                {/* Status / Actions */}
                {req.status === 'pending' ? (
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => doApprove(req.id)}
                      disabled={approving}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button
                      onClick={() => setExpandedReject(expandedReject === req.id ? null : req.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-red-50 hover:text-red-600"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                ) : (
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                )}
              </div>
              {/* Notes */}
              {req.notes && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">"{req.notes}"</p>
                </div>
              )}
              {/* Reject form */}
              {expandedReject === req.id && (
                <div className="px-5 pb-4 bg-red-50/30 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-600 mb-1 mt-3">Motivo del rechazo (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Saldo insuficiente de la empresa"
                      className="input-field flex-1 text-sm"
                      value={rejectNotes[req.id] ?? ''}
                      onChange={e => setRejectNotes(n => ({ ...n, [req.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => doReject({ id: req.id, notes: rejectNotes[req.id] })}
                      className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                    >
                      Confirmar rechazo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
