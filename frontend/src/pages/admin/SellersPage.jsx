import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sellersApi, mikrotikApi } from '../../services/api';
import { Plus, ChevronRight, DollarSign, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [reloadModal, setReloadModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', monthly_limit: 2000, device_id: '' });
  const [reloadData, setReloadData] = useState({ amount: '', description: '' });
  // Búsqueda y filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [sortBy, setSortBy] = useState('name'); // name | balance

  const { data, isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => sellersApi.list().then(r => r.data.data),
  });

  const { data: devicesData } = useQuery({
    queryKey: ['mikrotik-devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });
  const devices = devicesData ?? [];

  // Filtrado y ordenamiento (cliente)
  const sellers = useMemo(() => {
    let list = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q)
      );
    }
    if (statusFilter === 'active') list = list.filter(s => s.is_active);
    if (statusFilter === 'inactive') list = list.filter(s => !s.is_active);
    if (sortBy === 'balance') list = [...list].sort((a, b) => parseFloat(b.balance?.balance ?? 0) - parseFloat(a.balance?.balance ?? 0));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, search, statusFilter, sortBy]);

  const createMutation = useMutation({
    mutationFn: () => sellersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries(['sellers']);
      toast.success('Vendedor creado exitosamente');
      setModal(false);
      setForm({ name: '', email: '', password: '', phone: '', monthly_limit: 2000, device_id: '' });
    },
    onError: (e) => toast.error(e.response?.data?.errors?.[0]?.msg || e.response?.data?.error || 'Error'),
  });

  const reloadMutation = useMutation({
    mutationFn: ({ id, data }) => sellersApi.reloadBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['sellers']);
      toast.success('Saldo recargado');
      setReloadModal(null);
      setReloadData({ amount: '', description: '' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al recargar'),
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-sm text-gray-500">
            {sellers.length} de {data?.length ?? 0} vendedores
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Nuevo Vendedor
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            className="input pl-9 pr-8 w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
        <select className="input w-auto" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Ordenar por nombre</option>
          <option value="balance">Ordenar por saldo</option>
        </select>
      </div>

      {/* Sellers List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array(5).fill().map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>{search ? `Sin resultados para "${search}"` : 'No hay vendedores registrados'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sellers.map(seller => (
              <div key={seller.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                  {seller.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{seller.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${seller.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {seller.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {seller.email}
                    {seller.device && <span className="ml-1 font-medium text-blue-500">· {seller.device.name}</span>}
                  </p>
                </div>
                <div className="text-right mr-3">
                  <p className="text-sm font-bold text-gray-800">Q{parseFloat(seller.balance?.balance || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">/ Q{parseFloat(seller.balance?.monthly_limit || 0).toFixed(0)} mes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setReloadModal(seller); }}
                    className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                    title="Recargar saldo"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/admin/sellers/${seller.id}`}
                    className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Crear Vendedor</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Nombre completo *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Correo electrónico *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Contraseña * (mín. 8 caracteres)</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Límite mensual (Q)</label>
                  <input type="number" className="input" value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} />
                </div>
                <div>
                  <label className="label">MikroTik asignado <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <select className="input" value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}>
                    <option value="">— Sin restricción (todos los dispositivos) —</option>
                    {devices.filter(d => d.status === 'online').map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.zone}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Si asignas un dispositivo, el vendedor solo podrá vender fichas de ese MikroTik.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.email || !form.password}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Vendedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reload Balance Modal */}
      {reloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Recargar Saldo</h2>
              <p className="text-sm text-gray-500 mb-5">
                Vendedor: <strong>{reloadModal.name}</strong><br />
                Saldo actual: <strong>Q{parseFloat(reloadModal.balance?.balance || 0).toFixed(2)}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="label">Monto a recargar (Q) *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    className="input"
                    value={reloadData.amount}
                    onChange={e => setReloadData({ ...reloadData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Descripción (opcional)</label>
                  <input className="input" value={reloadData.description} onChange={e => setReloadData({ ...reloadData, description: e.target.value })} placeholder="Recarga mensual" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setReloadModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => reloadMutation.mutate({ id: reloadModal.id, data: reloadData })}
                  disabled={reloadMutation.isPending || !reloadData.amount}
                  className="btn-success flex-1"
                >
                  {reloadMutation.isPending ? 'Recargando...' : 'Recargar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
