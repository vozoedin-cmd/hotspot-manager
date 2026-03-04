import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersApi, mikrotikApi } from '../../services/api';
import { ArrowLeft, PlusCircle, CheckCircle, XCircle, Clock, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

const statusBadge = (status) => {
  if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Aprobada</span>;
  if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Rechazada</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Pendiente</span>;
};

export default function SellerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [reloadForm, setReloadForm] = useState({ amount: '', description: '' });
  const [showReloadForm, setShowReloadForm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller', id],
    queryFn: () => sellersApi.get(id).then(r => r.data.data),
  });

  const { data: devicesData } = useQuery({
    queryKey: ['mikrotik-devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });
  const devices = devicesData ?? [];

  const { data: txData } = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => sellersApi.transactions(id, { limit: 20 }).then(r => r.data),
  });

  const { data: reqData, refetch: refetchReqs } = useQuery({
    queryKey: ['seller-requests', id],
    queryFn: () => sellersApi.getSellerRequests(id).then(r => r.data),
  });

  const { mutate: doReload, isPending: reloading } = useMutation({
    mutationFn: (data) => sellersApi.reloadBalance(id, data),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setReloadForm({ amount: '', description: '' });
      setShowReloadForm(false);
      queryClient.invalidateQueries({ queryKey: ['seller', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al recargar'),
  });

  const { mutate: doEdit, isPending: editing } = useMutation({
    mutationFn: (data) => sellersApi.update(id, data),
    onSuccess: () => {
      toast.success('Vendedor actualizado');
      setEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['seller', id] });
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  });

  const { mutate: doApprove, isPending: approving } = useMutation({
    mutationFn: (reqId) => sellersApi.approveRequest(reqId, {}),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refetchReqs();
      queryClient.invalidateQueries({ queryKey: ['seller', id] });
      queryClient.invalidateQueries({ queryKey: ['balance-requests-count'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const { mutate: doReject } = useMutation({
    mutationFn: (reqId) => sellersApi.rejectRequest(reqId, {}),
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      refetchReqs();
      queryClient.invalidateQueries({ queryKey: ['balance-requests-count'] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const transactions = txData?.data || [];
  const requests = reqData?.data || [];
  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleReload = (e) => {
    e.preventDefault();
    if (!reloadForm.amount || parseFloat(reloadForm.amount) <= 0) return toast.error('Ingresa un monto válido');
    doReload(reloadForm);
  };

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="card h-40" />
    </div>
  );

  if (!seller) return <div className="text-gray-400 text-center py-12">Vendedor no encontrado</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
          <p className="text-sm text-gray-500">{seller.email}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${seller.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {seller.is_active ? 'Activo' : 'Inactivo'}
        </span>
        <button
          onClick={() => {
            setEditForm({
              name: seller.name,
              phone: seller.phone || '',
              is_active: seller.is_active,
              monthly_limit: seller.balance?.monthly_limit ?? 2000,
              device_id: seller.device_id || '',
            });
            setEditModal(true);
          }}
          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
          title="Editar vendedor"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Saldo disponible</p>
          <p className="text-2xl font-bold text-green-600">Q{parseFloat(seller.balance?.balance || 0).toFixed(2)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Límite mensual</p>
          <p className="text-2xl font-bold text-blue-600">Q{parseFloat(seller.balance?.monthly_limit || 0).toFixed(2)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Total gastado</p>
          <p className="text-2xl font-bold text-gray-700">Q{parseFloat(seller.balance?.total_spent || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Solicitudes pendientes del vendedor */}
      {pendingRequests.length > 0 && (
        <div className="card border-l-4 border-yellow-400 p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold text-gray-800 text-sm">
              Solicitudes pendientes ({pendingRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Q{parseFloat(req.amount).toFixed(2)}</p>
                  {req.notes && <p className="text-xs text-gray-500">{req.notes}</p>}
                  <p className="text-xs text-gray-400">{format(new Date(req.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => doApprove(req.id)} disabled={approving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-60">
                    <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                  </button>
                  <button onClick={() => doReject(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-red-50 hover:text-red-600">
                    <XCircle className="w-3.5 h-3.5" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recargar Saldo Manual */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={() => setShowReloadForm(!showReloadForm)}>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Recargar saldo manualmente</h2>
          </div>
          <span className="text-xs text-blue-600">{showReloadForm ? 'Cerrar' : 'Abrir'}</span>
        </div>
        {showReloadForm && (
          <form onSubmit={handleReload} className="px-5 py-4 space-y-3 bg-blue-50/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monto (Q)</label>
                <input type="number" min="0.01" step="0.01" placeholder="Ej: 50.00" className="input-field"
                  value={reloadForm.amount} onChange={e => setReloadForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
                <input type="text" placeholder="Recarga manual" className="input-field"
                  value={reloadForm.description} onChange={e => setReloadForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={reloading} className="btn-primary text-sm disabled:opacity-60">
              {reloading ? 'Recargando...' : `Recargar${reloadForm.amount ? ' Q' + parseFloat(reloadForm.amount || 0).toFixed(2) : ''}`}
            </button>
          </form>
        )}
      </div>

      {/* Historial de solicitudes */}
      {requests.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Historial de solicitudes de saldo</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Q{parseFloat(req.amount).toFixed(2)}</p>
                  {req.notes && <p className="text-xs text-gray-500">{req.notes}</p>}
                  <p className="text-xs text-gray-400">{format(new Date(req.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
                {statusBadge(req.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Últimas Transacciones</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Sin transacciones</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-700">{tx.description || tx.type}</p>
                  <p className="text-xs text-gray-400">{format(new Date(tx.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'credit' || tx.type === 'monthly_reload' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'debit' ? '-' : '+'}Q{parseFloat(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Editar Vendedor</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Nombre completo</label>
                  <input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Límite mensual (Q)</label>
                  <input type="number" className="input" value={editForm.monthly_limit} onChange={e => setEditForm({ ...editForm, monthly_limit: e.target.value })} />
                </div>
                <div>
                  <label className="label">MikroTik asignado</label>
                  <select className="input" value={editForm.device_id} onChange={e => setEditForm({ ...editForm, device_id: e.target.value })}>
                    <option value="">— Sin restricción (todos los dispositivos) —</option>
                    {devices.filter(d => d.status === 'online').map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.zone}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Si asignas un dispositivo, solo podrá vender fichas de ese MikroTik.</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">Cuenta activa</span>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => doEdit(editForm)}
                  disabled={editing || !editForm.name}
                  className="btn-primary flex-1"
                >
                  {editing ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

