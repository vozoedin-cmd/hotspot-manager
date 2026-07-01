import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { vouchersApi, packagesApi, mikrotikApi, reportsApi } from '../../services/api';
import { 
  Plus, RefreshCw, Ban, Eye, EyeOff, FileSpreadsheet, 
  FileText, Search, X, Copy, Check, MoreVertical, 
  Ticket, CheckCircle, DollarSign, Wifi, Clock, Router
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { TableSkeleton, QueryError, DashboardSkeleton } from '../../components/Skeleton';
import useThemeStore from '../../store/themeStore';

const STATUS_LABELS = {
  available: { label: 'Disponible', bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  sold: { label: 'Vendida', bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  active: { label: 'Activa', bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  used: { label: 'Usada', bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  expired: { label: 'Expirada', bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
  disabled: { label: 'Deshabilitada', bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
};

function StatCard({ title, value, icon: Icon, colorClass, loading }) {
  return (
    <div className="glass-card-premium p-4 flex items-center gap-4 animate-fade-in">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white">
          {loading ? '–' : value}
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-slate-400 hover:text-blue-400 transition-colors p-1" title="Copiar">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ActionMenu({ voucher, onDisable }) {
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
        onClick={() => setOpen(!open)} 
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`Código: ${voucher.code}\nPass: ${voucher.password || ''}`);
              toast.success('Copiado al portapapeles');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar Info
          </button>
          
          {voucher.status === 'available' && (
            <button 
              onClick={() => {
                onDisable(voucher.id);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
            >
              <Ban className="w-3.5 h-3.5" /> Deshabilitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VouchersPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', package_id: '', device_id: '', code: '', page: 1 });

  // Fetch Summary Stats
  const { data: dashData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data.data),
    staleTime: 60000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
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
      qc.invalidateQueries(['dashboard']);
      toast.success('Ficha deshabilitada');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al deshabilitar'),
  });

  const handleDisable = (id) => {
    if (confirm(`¿Estás seguro de deshabilitar esta ficha?`)) {
      disableMutation.mutate(id);
    }
  };

  const vouchers = data?.data || [];
  const pagination = data?.pagination || {};
  const vStats = dashData?.vouchers || {};

  const handleExcelExport = () => {
    const rows = vouchers.map((v) => ({
      Código: v.code,
      Contraseña: v.password ?? '',
      Paquete: v.package?.name ?? '',
      Router: v.device?.name ?? '',
      Vendedor: v.seller?.name ?? '',
      Estado: STATUS_LABELS[v.status]?.label ?? v.status,
      Creado: v.created_at ? format(new Date(v.created_at), 'dd/MM/yyyy HH:mm') : '-',
    }));
    exportToExcel(rows, Object.keys(rows[0] ?? {}), 'fichas_hotspot', 'Fichas');
  };

  const handlePDFExport = () => {
    exportToPDF({
      title: 'Fichas Hotspot',
      subtitle: filters.status ? `Estado: ${STATUS_LABELS[filters.status]?.label}` : 'Todos los estados',
      columns: ['Código', 'Paquete', 'Router', 'Vendedor', 'Estado', 'Creado'],
      data: vouchers.map((v) => [
        v.code,
        v.package?.name ?? '—',
        v.device?.name ?? '—',
        v.seller?.name ?? '—',
        STATUS_LABELS[v.status]?.label ?? v.status,
        v.created_at ? format(new Date(v.created_at), 'dd/MM/yy') : '-',
      ]),
      summary: [
        { label: 'Total fichas', value: pagination.total ?? vouchers.length },
        { label: 'Página', value: `${pagination.page ?? 1} / ${pagination.pages ?? 1}` },
      ],
    });
  };

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Fichas</h1>
          <p className="text-sm text-slate-400 mt-1">Administra el inventario de pines del Hotspot</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExcelExport}
            disabled={vouchers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 disabled:opacity-40 text-sm font-medium rounded-xl transition-all"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={handlePDFExport}
            disabled={vouchers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 disabled:opacity-40 text-sm font-medium rounded-xl transition-all"
            title="Exportar a PDF"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <Link to="/admin/vouchers/generate" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="w-4 h-4" /> Generar Fichas
          </Link>
        </div>
      </div>

      {/* Top Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total" value={vStats.total || 0} icon={Ticket} colorClass="bg-blue-500/20 text-blue-400" loading={isLoadingStats} />
        <StatCard title="Disponibles" value={vStats.available || 0} icon={CheckCircle} colorClass="bg-green-500/20 text-green-400" loading={isLoadingStats} />
        <StatCard title="Vendidas" value={vStats.sold || 0} icon={DollarSign} colorClass="bg-yellow-500/20 text-yellow-400" loading={isLoadingStats} />
        <StatCard title="Activas" value={vStats.active || 0} icon={Wifi} colorClass="bg-indigo-500/20 text-indigo-400" loading={isLoadingStats} />
        <StatCard title="Usadas" value={vStats.used || 0} icon={Clock} colorClass="bg-red-500/20 text-red-400" loading={isLoadingStats} />
      </div>

      {/* Filters & Table Container */}
      <div className="glass-card-premium overflow-hidden animate-fade-in delay-100 flex flex-col">
        
        {/* Filters Row */}
        <div className="p-4 border-b border-white/5 bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código..."
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={filters.code}
                onChange={(e) => setFilters({ ...filters, code: e.target.value, page: 1 })}
              />
              {filters.code && (
                <button onClick={() => setFilters({ ...filters, code: '', page: 1 })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <select
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>

            <select
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
              value={filters.package_id}
              onChange={(e) => setFilters({ ...filters, package_id: e.target.value, page: 1 })}
            >
              <option value="">Todos los paquetes</option>
              {packages?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-all"
              value={filters.device_id}
              onChange={(e) => setFilters({ ...filters, device_id: e.target.value, page: 1 })}
            >
              <option value="">Todos los routers</option>
              {devices?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <button
              onClick={() => setFilters({ status: '', package_id: '', device_id: '', code: '', page: 1 })}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Limpiar
            </button>
          </div>
        </div>

        {/* Card-Style List */}
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={6} /></div>
          ) : isError ? (
            <div className="p-4"><QueryError onRetry={refetch} /></div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Ticket className="w-12 h-12 mb-3 opacity-20" />
              <p>No se encontraron fichas con los filtros actuales</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* Header "Falso" de la lista */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Código / Pass</div>
                <div className="col-span-2">Paquete</div>
                <div className="col-span-2">Estado</div>
                <div className="col-span-2">Router</div>
                <div className="col-span-2">Vendedor</div>
                <div className="col-span-2 flex justify-between">
                  <span>Fecha</span>
                  <span></span>
                </div>
              </div>

              {/* Fila Estilo Tarjeta */}
              {vouchers.map((v) => {
                const st = STATUS_LABELS[v.status] || { label: v.status, bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
                const sellerInitial = v.seller?.name ? v.seller.name.charAt(0).toUpperCase() : '?';

                return (
                  <div key={v.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 rounded-2xl transition-all">
                    
                    {/* Código */}
                    <div className="col-span-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white text-sm tracking-wide">{v.code}</span>
                        <CopyButton text={v.code} />
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        P: {v.password || '---'}
                      </div>
                    </div>

                    {/* Paquete */}
                    <div className="col-span-2">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                        {v.package?.name || 'Desconocido'}
                      </span>
                    </div>

                    {/* Estado */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        {st.label}
                      </span>
                    </div>

                    {/* Router */}
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Router className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-300 truncate">{v.device?.name || 'Local'}</span>
                        <span className="text-[10px] text-slate-500 truncate">{v.device?.ip_address || ''}</span>
                      </div>
                    </div>

                    {/* Vendedor */}
                    <div className="col-span-2 flex items-center gap-2">
                      {v.seller ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {sellerInitial}
                          </div>
                          <span className="text-sm text-slate-300 truncate">{v.seller.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500 italic">-</span>
                      )}
                    </div>

                    {/* Fecha y Acciones */}
                    <div className="col-span-2 flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-300 truncate">
                          {v.created_at ? formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es }) : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {v.created_at ? format(new Date(v.created_at), 'dd/MM/yy HH:mm') : '-'}
                        </span>
                      </div>
                      <ActionMenu voucher={v} onDisable={handleDisable} />
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-white/5 bg-slate-900/40 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Mostrando página <span className="font-medium text-white">{pagination.page}</span> de <span className="font-medium text-white">{pagination.pages}</span>
            </p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                disabled={pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </button>
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-xl transition-colors"
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
