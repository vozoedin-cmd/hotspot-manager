import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, authApi, sellersApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { User, Lock, ArrowUpRight, ArrowDownLeft, PlusCircle, X, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function SellerProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ amount: '', notes: '' });

  const { data: dash } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => reportsApi.sellerDashboard().then((r) => r.data),
  });

  // Mis solicitudes de saldo
  const { data: myRequestsData, refetch: refetchRequests } = useQuery({
    queryKey: ['my-balance-requests'],
    queryFn: () => sellersApi.getMyBalanceRequests().then(r => r.data),
  });

  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPasswords({ current: '', newPass: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al cambiar contraseña'),
  });

  const { mutate: sendRequest, isPending: sendingRequest } = useMutation({
    mutationFn: (data) => sellersApi.requestBalance(data),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setShowRequestModal(false);
      setRequestForm({ amount: '', notes: '' });
      refetchRequests();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al enviar solicitud'),
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) return toast.error('Las contraseñas no coinciden');
    if (passwords.newPass.length < 8) return toast.error('Mínimo 8 caracteres');
    changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
  };

  const transactions = dash?.recentTransactions ?? [];
  const myRequests = myRequestsData?.data ?? [];
  const hasPendingRequest = myRequests.some(r => r.status === 'pending');

  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!requestForm.amount || parseFloat(requestForm.amount) < 1) return toast.error('Monto mínimo Q1.00');
    sendRequest(requestForm);
  };

  const txIcon = (type) => {
    if (type === 'credit' || type === 'monthly_reload')
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    return <ArrowUpRight className="w-4 h-4 text-red-400" />;
  };

  const reqStatusLabel = (status) => {
    if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Aprobada</span>;
    if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Rechazada</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>;
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Avatar */}
      <div className="flex flex-col items-center py-4 gap-2">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="badge badge-info text-xs mt-1">Vendedor</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {[{ id: 'profile', label: 'Perfil', icon: User }, { id: 'security', label: 'Seguridad', icon: Lock }].map(
          (t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        )}
      </div>

      {tab === 'profile' ? (
        <div className="space-y-4">
          {/* Balance summary */}
          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Resumen de saldo</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Saldo actual', value: `Q${Number(dash?.balance ?? 0).toFixed(2)}`, c: 'text-blue-600' },
                { label: 'Límite mensual', value: `Q${Number(dash?.monthlyLimit ?? 2000).toFixed(2)}`, c: 'text-gray-700' },
                { label: 'Total ganado', value: `Q${Number(dash?.totalEarned ?? 0).toFixed(2)}`, c: 'text-green-600' },
                { label: 'Total gastado', value: `Q${Number(dash?.totalSpent ?? 0).toFixed(2)}`, c: 'text-red-500' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`font-bold ${item.c}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Solicitar Saldo */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Solicitar recarga de saldo</h3>
                <p className="text-xs text-gray-400 mt-0.5">El administrador recibirá tu solicitud</p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                disabled={hasPendingRequest}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {hasPendingRequest ? 'Solicitud pendiente' : 'Solicitar saldo'}
              </button>
            </div>
            {/* Mis últimas solicitudes */}
            {myRequests.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-50">
                {myRequests.slice(0, 5).map(req => (
                  <li key={req.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Q{parseFloat(req.amount).toFixed(2)}</p>
                      {req.notes && <p className="text-xs text-gray-400">{req.notes}</p>}
                      <p className="text-xs text-gray-400">{format(new Date(req.created_at), 'dd/MM/yy HH:mm')}</p>
                    </div>
                    {reqStatusLabel(req.status)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Transactions */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Últimas transacciones</h3>
            </div>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin transacciones</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <li key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-full">{txIcon(tx.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 font-medium">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-gray-400">{format(new Date(tx.created_at || tx.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <span className={`font-bold text-sm ${tx.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
                      {tx.type === 'debit' ? '-' : '+'}Q{Number(tx.amount).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Cambiar contraseña</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña actual</label>
            <input
              type="password"
              className="input-field"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
            <input
              type="password"
              className="input-field"
              value={passwords.newPass}
              onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              className="input-field"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={isPending} className="btn-primary w-full justify-center disabled:opacity-60">
            {isPending ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      )}

      {/* Modal: Solicitar Saldo */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Solicitar recarga de saldo</h2>
              <button onClick={() => setShowRequestModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSendRequest} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto solicitado (Q)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Ej: 100.00"
                  className="input-field"
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Nota (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Necesito saldo para ventas del fin de semana"
                  className="input-field resize-none"
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" disabled={sendingRequest}
                  className="flex-1 btn-primary justify-center disabled:opacity-60 text-sm">
                  {sendingRequest ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
