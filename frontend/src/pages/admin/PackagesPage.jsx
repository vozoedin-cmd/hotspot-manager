import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi, mikrotikApi } from '../../services/api';
import { 
  Plus, Edit, Trash2, Clock, Copy, MoreVertical, 
  Box, Server, Search, X, RefreshCw, Layers, Zap, AlertTriangle, CheckCircle, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', description: '', duration_value: 1, duration_unit: 'hours',
  price: '', cost: '', speed_download: '', speed_upload: '',
  mikrotik_profile: '', color: '#3B82F6', is_active: true, device_id: '',
};

const DURATION_UNITS = {
  minutes: 'Minutos', hours: 'Horas', days: 'Días', weeks: 'Semanas', months: 'Meses',
};

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

function ActionMenu({ onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

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
        <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
          >
            <Edit className="w-4 h-4 text-blue-400" /> Editar
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2.5"
          >
            <Copy className="w-4 h-4 text-indigo-400" /> Duplicar
          </button>

          <div className="h-px bg-slate-700/50 my-1"></div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2.5 font-medium"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

export default function PackagesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  
  // Filtros locales
  const [filters, setFilters] = useState({ search: '', status: '', device_id: '' });

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['packages-all'],
    queryFn: () => packagesApi.list().then(r => r.data.data),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editPkg ? packagesApi.update(editPkg.id, data) : packagesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['packages-all']);
      qc.invalidateQueries(['packages']);
      toast.success(editPkg ? 'Paquete actualizado' : 'Paquete creado');
      closeModal();
    },
    onError: (e) => toast.error(e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => packagesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['packages-all']);
      toast.success('Paquete eliminado');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se puede eliminar'),
  });

  const openCreate = () => { setEditPkg(null); setForm(EMPTY_FORM); setModal(true); };
  
  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name, description: pkg.description || '',
      duration_value: pkg.duration_value, duration_unit: pkg.duration_unit,
      price: pkg.price, cost: pkg.cost,
      speed_download: pkg.speed_download || '', speed_upload: pkg.speed_upload || '',
      mikrotik_profile: pkg.mikrotik_profile || '', color: pkg.color || '#3B82F6',
      is_active: pkg.is_active, device_id: pkg.device_id || '',
    });
    setModal(true);
  };

  const openDuplicate = (pkg) => {
    setEditPkg(null); // Force create new
    setForm({
      name: `${pkg.name} (Copia)`, description: pkg.description || '',
      duration_value: pkg.duration_value, duration_unit: pkg.duration_unit,
      price: pkg.price, cost: pkg.cost,
      speed_download: pkg.speed_download || '', speed_upload: pkg.speed_upload || '',
      mikrotik_profile: pkg.mikrotik_profile || '', color: pkg.color || '#3B82F6',
      is_active: pkg.is_active, device_id: pkg.device_id || '',
    });
    setModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este paquete de forma permanente?')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => { setModal(false); setEditPkg(null); };

  // Calculations & Filtering
  const packages = packagesData || [];
  
  const filteredPackages = useMemo(() => {
    return packages.filter(p => {
      if (filters.status === 'active' && !p.is_active) return false;
      if (filters.status === 'inactive' && p.is_active) return false;
      if (filters.device_id && p.device_id !== filters.device_id) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        return p.name.toLowerCase().includes(query) || (p.mikrotik_profile && p.mikrotik_profile.toLowerCase().includes(query));
      }
      return true;
    });
  }, [packages, filters]);

  const stats = useMemo(() => {
    const active = packages.filter(p => p.is_active).length;
    let outOfStock = 0;
    let potentialRevenue = 0;
    
    packages.forEach(p => {
      const stock = p.available_count || 0;
      if (stock === 0 && p.is_active) outOfStock++;
      potentialRevenue += (stock * parseFloat(p.price || 0));
    });

    return { total: packages.length, active, outOfStock, potentialRevenue };
  }, [packages]);

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Catálogo de Paquetes</h1>
          <p className="text-sm text-slate-400 mt-1">Configura planes, precios y perfiles para tus clientes</p>
        </div>
        <button 
          onClick={openCreate} 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Nuevo Paquete
        </button>
      </div>

      {/* Top Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Paquetes" value={stats.total} icon={Layers} colorClass="bg-blue-500/20 text-blue-400" loading={isLoading} />
        <StatCard title="Activos" value={stats.active} icon={CheckCircle} colorClass="bg-green-500/20 text-green-400" loading={isLoading} />
        <StatCard title="Agotados (Sin Stock)" value={stats.outOfStock} icon={AlertTriangle} colorClass="bg-orange-500/20 text-orange-400" loading={isLoading} />
        <StatCard title="Ingreso Potencial" value={`Q${stats.potentialRevenue.toFixed(2)}`} subtitle="en stock" icon={TrendingUp} colorClass="bg-emerald-500/20 text-emerald-400" loading={isLoading} />
      </div>

      {/* Filters Row */}
      <div className="glass-card-premium p-4 border-b border-white/5 bg-slate-900/40 rounded-2xl flex flex-wrap items-center gap-3 animate-fade-in delay-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o perfil..."
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button onClick={() => setFilters({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <select
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Todos los estados</option>
          <option value="active">Solo Activos</option>
          <option value="inactive">Solo Inactivos</option>
        </select>

        <select
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
          value={filters.device_id}
          onChange={(e) => setFilters({ ...filters, device_id: e.target.value })}
        >
          <option value="">Todos los routers</option>
          {devices?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <button
          onClick={() => setFilters({ search: '', status: '', device_id: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Limpiar
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in delay-200">
        {isLoading ? (
          Array(6).fill().map((_, i) => (
            <div key={i} className="glass-card-premium p-6 rounded-2xl animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-700/50 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-700/50 rounded w-1/3"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-700/50 rounded w-full"></div>
                <div className="h-4 bg-slate-700/50 rounded w-full"></div>
              </div>
            </div>
          ))
        ) : filteredPackages.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-900/20 rounded-3xl border border-dashed border-slate-700/50">
            <Box className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-300">No se encontraron paquetes</p>
            <p className="text-sm mt-1">Prueba cambiando los filtros o crea un nuevo paquete.</p>
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const stock = pkg.available_count || 0;
            const price = parseFloat(pkg.price || 0);
            const cost = parseFloat(pkg.cost || 0);
            const profit = price - cost;
            const device = devices?.find(d => d.id === pkg.device_id);

            // Availability badge logic
            let stockBadge = { label: 'Sin Stock', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' };
            if (stock > 10) stockBadge = { label: 'Disponible', bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' };
            else if (stock > 0) stockBadge = { label: 'Poco Stock', bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500' };

            return (
              <div key={pkg.id} className={`glass-card-premium p-6 rounded-2xl hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 flex flex-col relative overflow-hidden ${!pkg.is_active ? 'opacity-60 grayscale-[30%]' : ''}`}>
                
                {/* Accent Top Border */}
                <div className="absolute top-0 left-0 w-full h-1.5 opacity-80" style={{ backgroundColor: pkg.color || '#3B82F6' }}></div>

                {/* Header */}
                <div className="flex items-start justify-between mb-5 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${pkg.color}25` }}>
                      <Zap className="w-6 h-6" style={{ color: pkg.color || '#3B82F6' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white truncate max-w-[150px]" title={pkg.name}>{pkg.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {pkg.duration_value} {DURATION_UNITS[pkg.duration_unit]}
                      </div>
                    </div>
                  </div>
                  <ActionMenu 
                    onEdit={() => openEdit(pkg)} 
                    onDuplicate={() => openDuplicate(pkg)} 
                    onDelete={() => handleDelete(pkg.id)} 
                  />
                </div>

                {/* Status & Availability Badges */}
                <div className="flex items-center gap-2 mb-5">
                  {!pkg.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700/50 text-slate-400">
                      Inactivo
                    </span>
                  ) : null}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${stockBadge.bg} ${stockBadge.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stockBadge.dot} animate-pulse`}></span>
                    {stockBadge.label}: {stock}
                  </span>
                </div>

                {/* Financials */}
                <div className="bg-slate-800/40 rounded-xl p-4 mb-5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Precio Venta</span>
                    <span className="font-bold text-white text-base">Q{price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Costo Vendedor</span>
                    <span className="font-medium text-slate-300">Q{cost.toFixed(2)}</span>
                  </div>
                  <div className="h-px w-full bg-slate-700/50"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">Ganancia</span>
                    <span className="font-bold text-green-400">Q{profit.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  {/* Mikrotik Profile */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Layers className="w-4 h-4 text-slate-500" /> Perfil
                    </div>
                    <code className="text-xs font-mono font-medium text-blue-300">
                      {pkg.mikrotik_profile || 'default'}
                    </code>
                  </div>

                  {/* Router */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Server className="w-4 h-4 text-slate-500" /> Router
                    </div>
                    {device ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-indigo-300 truncate max-w-[100px]">{device.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{device.ip_address}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded-md">
                        Global
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal - Customized for Dark Admin Theme */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Box className="w-6 h-6 text-blue-500" />
                {editPkg ? 'Editar Paquete' : 'Crear Nuevo Paquete'}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre del Paquete *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: 1 Hora Full" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Duración *</label>
                    <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" min={1} value={form.duration_value} onChange={e => setForm({ ...form, duration_value: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Unidad *</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.duration_unit} onChange={e => setForm({ ...form, duration_unit: e.target.value })}>
                      {Object.entries(DURATION_UNITS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Precio de Venta (Q) *</label>
                    <input type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Costo Vendedor (Q) *</label>
                    <input type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-slate-400" /> Configuración Avanzada</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Velocidad Bajada (M/K)</label>
                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.speed_download} onChange={e => setForm({ ...form, speed_download: e.target.value })} placeholder="Ej: 2M" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Velocidad Subida (M/K)</label>
                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.speed_upload} onChange={e => setForm({ ...form, speed_upload: e.target.value })} placeholder="Ej: 1M" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Perfil en MikroTik (Debe existir)</label>
                      <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors" value={form.mikrotik_profile} onChange={e => setForm({ ...form, mikrotik_profile: e.target.value })} placeholder="default" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Router Asignado</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}>
                        <option value="">Global (Todos los routers)</option>
                        {devices?.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Color del Paquete</label>
                    <div className="flex gap-3 items-center">
                      <input type="color" className="h-10 w-14 rounded-xl border-0 cursor-pointer bg-slate-800 overflow-hidden" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                      <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button onClick={closeModal} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.name || !form.price || !form.cost}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar Paquete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
