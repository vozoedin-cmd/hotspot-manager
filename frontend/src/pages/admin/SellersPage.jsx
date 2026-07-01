import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { sellersApi, mikrotikApi, reportsApi } from '../../services/api';
import { 
  Plus, DollarSign, Search, X, MoreVertical, Users, 
  CheckCircle, Ban, TrendingUp, Briefcase, RefreshCw,
  Server, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

function StatCard({ title, value, subtitle, icon: Icon, colorClass, loading }) {
  return (
    <div className="glass-card-premium p-5 flex items-center gap-4 animate-fade-in hover:-translate-y-1 transition-transform duration-300">
      <div className={`p-3.5 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white tracking-tight">
            {loading ? '–' : value}
          </p>
          {subtitle && <span className="text-xs text-slate-500 font-medium">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ seller, onReload, onDisable }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }} 
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <button 
            onClick={() => { navigate(`/admin/sellers/${seller.id}`); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
          >
            <Shield className="w-4 h-4 text-blue-400" /> Ver Perfil Completo
          </button>
          
          <button 
            onClick={() => { onReload(seller); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
          >
            <DollarSign className="w-4 h-4 text-green-400" /> Recargar Saldo
          </button>

          {/* Futuras opciones
          <button className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5 opacity-50 cursor-not-allowed">
            <RefreshCw className="w-4 h-4 text-orange-400" /> Reiniciar Pass
          </button>
          */}

          {seller.is_active && onDisable && (
            <>
              <div className="h-px bg-slate-700/50 my-1"></div>
              <button 
                onClick={() => { onDisable(seller.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2.5 font-medium"
              >
                <Ban className="w-4 h-4" /> Desactivar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SellersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [reloadModal, setReloadModal] = useState(null);
  
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', monthly_limit: 2000, device_id: '' });
  const [reloadData, setReloadData] = useState({ amount: '', description: '' });
  
  // Búsqueda y filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('name'); 

  // Data fetching
  const { data: dashboardData, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data.data),
    staleTime: 60000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => sellersApi.list().then(r => r.data.data),
  });

  const { data: devicesData } = useQuery({
    queryKey: ['mikrotik-devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });
  const devices = devicesData ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => sellersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries(['sellers']);
      toast.success('Vendedor creado exitosamente');
      setModal(false);
      setForm({ name: '', email: '', password: '', phone: '', monthly_limit: 2000, device_id: '' });
    },
    onError: (e) => toast.error(e.response?.data?.errors?.[0]?.msg || e.response?.data?.error || 'Error al crear'),
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

  // Filtrado y ordenamiento local
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
    
    if (sortBy === 'balance') {
      list = [...list].sort((a, b) => parseFloat(b.balance?.balance ?? 0) - parseFloat(a.balance?.balance ?? 0));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [data, search, statusFilter, sortBy]);

  // Calculations
  const stats = useMemo(() => {
    const list = data ?? [];
    const active = list.filter(s => s.is_active).length;
    const inactive = list.length - active;
    
    // Fallback if dashboard data is missing
    const rev = dashboardData?.revenue || {};
    const totalMonth = rev.this_month || 0;
    const totalToday = rev.today || 0;

    return { total: list.length, active, inactive, totalMonth, totalToday };
  }, [data, dashboardData]);

  if (isError) return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
      Error al cargar vendedores. <button onClick={() => refetch()} className="underline font-semibold hover:text-red-300">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Red de Vendedores</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona las cuentas, metas y recargas de tus distribuidores</p>
        </div>
        <button 
          onClick={() => setModal(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Nuevo Vendedor
        </button>
      </div>

      {/* Top Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vendedores" value={stats.total} icon={Users} colorClass="bg-blue-500/20 text-blue-400" loading={isLoading} />
        <StatCard title="Vendedores Activos" value={stats.active} subtitle={`/ ${stats.inactive} Inactivos`} icon={CheckCircle} colorClass="bg-green-500/20 text-green-400" loading={isLoading} />
        <StatCard title="Ventas del Mes" value={`Q${stats.totalMonth.toFixed(2)}`} icon={TrendingUp} colorClass="bg-emerald-500/20 text-emerald-400" loading={isLoadingDash} />
        <StatCard title="Ventas Hoy" value={`Q${stats.totalToday.toFixed(2)}`} icon={Briefcase} colorClass="bg-purple-500/20 text-purple-400" loading={isLoadingDash} />
      </div>

      {/* Filters Row */}
      <div className="glass-card-premium p-4 border-b border-white/5 bg-slate-900/40 rounded-2xl flex flex-wrap items-center gap-3 animate-fade-in delay-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario..."
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <select
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo Activos</option>
          <option value="inactive">Suspendidos</option>
        </select>

        <select
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Ordenar por Nombre</option>
          <option value="balance">Ordenar por Saldo (Mayor)</option>
        </select>
      </div>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in delay-200">
        {isLoading ? (
          Array(4).fill().map((_, i) => (
            <div key={i} className="glass-card-premium p-6 rounded-2xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-700/50 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-slate-700/50 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))
        ) : sellers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-900/20 rounded-3xl border border-dashed border-slate-700/50">
            <Users className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-300">No se encontraron vendedores</p>
            <p className="text-sm mt-1">Verifica tus filtros o crea un nuevo distribuidor.</p>
          </div>
        ) : (
          sellers.map((seller) => {
            const bal = parseFloat(seller.balance?.balance || 0);
            const limit = parseFloat(seller.balance?.monthly_limit || 1); // evite div by 0
            const pct = Math.min(Math.round((bal / limit) * 100), 100);
            let pbColor = 'bg-blue-500';
            if (pct < 20) pbColor = 'bg-red-500';
            else if (pct < 50) pbColor = 'bg-yellow-500';

            return (
              <div key={seller.id} className={`glass-card-premium p-6 rounded-2xl hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 flex flex-col relative ${!seller.is_active ? 'opacity-60 grayscale-[40%]' : ''}`}>
                
                {/* Header Profile */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center text-indigo-400 text-xl font-black border border-indigo-500/30 flex-shrink-0">
                      {seller.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white truncate">{seller.name}</h3>
                        {seller.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                            <span className="w-1 h-1 rounded-full bg-green-500"></span> ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                            <span className="w-1 h-1 rounded-full bg-red-500"></span> INACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">{seller.email}</p>
                    </div>
                  </div>
                  <ActionMenu 
                    seller={seller}
                    onReload={(s) => setReloadModal(s)}
                    onDisable={null} // Si deseas implementar toggle active
                  />
                </div>

                {/* Financial Progress Block */}
                <div className="bg-slate-800/40 rounded-xl p-5 border border-white/5 space-y-4 mb-4">
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">Saldo Disponible</p>
                      <p className="text-2xl font-bold text-white">Q{bal.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-medium mb-1">Meta / Límite</p>
                      <p className="text-sm font-semibold text-slate-300">Q{parseFloat(seller.balance?.monthly_limit || 0).toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 shadow-inner">
                    <div className={`h-2.5 rounded-full transition-all duration-1000 ${pbColor}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-right text-slate-500 font-medium">{pct}% consumido</p>
                </div>

                {/* Bottom Badges */}
                <div className="mt-auto flex flex-wrap gap-2">
                  {seller.device ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="truncate max-w-[120px]">{seller.device.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      <Server className="w-3.5 h-3.5 text-slate-500" /> Global (Todos)
                    </div>
                  )}
                  {seller.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      📞 {seller.phone}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR VENDEDOR */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black w-full max-w-md overflow-hidden">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-500" />
                Registrar Nuevo Vendedor
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre Completo *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo Electrónico (Usuario) *</label>
                  <input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="juan@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña * <span className="text-xs text-slate-500 font-normal">(mín. 8 caracteres)</span></label>
                  <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Teléfono</label>
                    <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Meta / Límite (Q)</label>
                    <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} />
                  </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Router Asignado (MikroTik)</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}>
                    <option value="">— Global (Todos los routers) —</option>
                    {devices.filter(d => d.status === 'online').map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.zone}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Si asignas un router, el vendedor solo podrá vender fichas de ese nodo.</p>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button onClick={() => setModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.email || !form.password}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Vendedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECARGAR SALDO */}
      {reloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black w-full max-w-sm overflow-hidden">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-400" />
                Liquidación / Recarga
              </h2>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-6">
                <p className="text-xs text-slate-400 mb-1">Distribuidor</p>
                <p className="text-sm font-bold text-white truncate">{reloadModal.name}</p>
                <div className="h-px bg-slate-700 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Saldo actual</span>
                  <span className="text-sm font-bold text-blue-400">Q{parseFloat(reloadModal.balance?.balance || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Monto a Inyectar (Q) *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-bold text-green-400 focus:outline-none focus:border-green-500 transition-colors"
                    value={reloadData.amount}
                    onChange={e => setReloadData({ ...reloadData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción (Opcional)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    value={reloadData.description}
                    onChange={e => setReloadData({ ...reloadData, description: e.target.value })}
                    placeholder="Ej: Pago de comisión semana 3"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button onClick={() => setReloadModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => reloadMutation.mutate({ id: reloadModal.id, data: reloadData })}
                  disabled={reloadMutation.isPending || !reloadData.amount}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reloadMutation.isPending ? 'Procesando...' : 'Aplicar Saldo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
