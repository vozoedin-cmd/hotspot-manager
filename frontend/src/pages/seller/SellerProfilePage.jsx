import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, authApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { User, Lock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function SellerProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });

  const { data: dash } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => reportsApi.sellerDashboard().then((r) => r.data),
  });

  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPasswords({ current: '', newPass: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Error al cambiar contraseña'),
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) return toast.error('Las contraseñas no coinciden');
    if (passwords.newPass.length < 8) return toast.error('Mínimo 8 caracteres');
    changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
  };

  const transactions = dash?.recentTransactions ?? [];

  const txIcon = (type) => {
    if (type === 'credit' || type === 'monthly_reload')
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    return <ArrowUpRight className="w-4 h-4 text-red-400" />;
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
    </div>
  );
}
