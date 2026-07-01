import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, mikrotikApi } from '../../services/api';
import {
  Ticket, Users, Router, TrendingUp, CheckCircle,
  XCircle, Clock, DollarSign, RefreshCw, Wifi,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { DashboardSkeleton, QueryError } from '../../components/Skeleton';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import useThemeStore from '../../store/themeStore';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', loading }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="glass-card-premium animate-fade-in p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-cuzo-textMuted mb-1">{title}</p>
          <p className={`text-2xl font-bold text-gray-900 dark:text-white ${loading ? 'opacity-40' : ''}`}>
            {loading ? '–' : value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${colors[color]} p-2.5 rounded-xl`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const DeviceStatusBadge = ({ status }) => {
  const cfg = {
    online: { cls: 'bg-green-100 text-green-700', label: 'Online' },
    offline: { cls: 'bg-gray-100 text-gray-500', label: 'Offline' },
    error: { cls: 'bg-red-100 text-red-600', label: 'Error' },
  };
  const { cls, label } = cfg[status] || cfg.offline;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-darkpanel border border-gray-200 dark:border-darkborder shadow-lg rounded-xl p-3">
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
          {format(parseISO(label), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <p className="font-bold text-gray-900 dark:text-white text-lg">
          Q{parseFloat(payload[0].value).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [chartDays, setChartDays] = useState(14);
  const { isDark } = useThemeStore();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['sales-by-day', chartDays],
    queryFn: () => reportsApi.salesByDay(chartDays).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Datos actualizados');
  };

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <QueryError onRetry={refetch} />;

  const vouchers = data?.vouchers || {};
  const revenue = data?.revenue || {};
  const sellers = data?.sellers || {};

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient-primary">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card-premium animate-fade-in delay-100 p-6 relative overflow-hidden">
          {/* Subtle gradient overlay to keep it colorful but glassy */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Ventas hoy</p>
              <p className="text-4xl font-bold mt-1">
                Q{revenue.today?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <div className="glass-card-premium animate-fade-in delay-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Ventas este mes</p>
              <p className="text-4xl font-bold mt-1">
                Q{revenue.this_month?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Fichas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard title="Total" value={vouchers.total || 0} icon={Ticket} color="blue" loading={isLoading} />
          <StatCard title="Disponibles" value={vouchers.available || 0} icon={CheckCircle} color="green" loading={isLoading} />
          <StatCard title="Vendidas" value={vouchers.sold || 0} icon={DollarSign} color="orange" loading={isLoading} />
          <StatCard title="Activas" value={vouchers.active || 0} icon={Wifi} color="cyan" loading={isLoading} />
          <StatCard title="Usadas" value={vouchers.used || 0} icon={Clock} color="red" loading={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Vendedores" value={sellers.total || 0} icon={Users} color="purple" loading={isLoading} />
        <StatCard
          title="Activos"
          value={sellers.active || 0}
          subtitle={`de ${sellers.total || 0}`}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
        <StatCard title="Routers" value={data?.devices?.length || 0} icon={Router} color="indigo" loading={isLoading} />
        <StatCard
          title="En línea"
          value={data?.devices?.filter(d => d.status === 'online').length || 0}
          icon={CheckCircle}
          color="emerald"
          loading={isLoading}
        />
      </div>

      {/* Sales Chart */}
      <div className="glass-card-premium animate-fade-in delay-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Ventas diarias</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ingresos por día</p>
          </div>
          <div className="flex gap-1">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  chartDays === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f3f4f6'} vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={v => format(parseISO(v), 'd MMM', { locale: es })}
                tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={v => `Q${v}`}
                tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={52}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? '#4b5563' : '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            Sin datos de ventas en este período
          </div>
        )}
      </div>

      {/* Devices Status */}
      {data?.devices?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado de Routers MikroTik</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.devices.map((device) => (
              <div key={device.id} className="cuzo-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 dark:bg-darkbg p-2 rounded-lg border border-gray-100 dark:border-darkborder">
                    <Router className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">{device.name}</p>
                    <p className="text-xs text-gray-400">
                      {device.last_sync
                        ? `Sync: ${format(new Date(device.last_sync), 'HH:mm')}`
                        : 'Sin sincronizar'}
                    </p>
                  </div>
                </div>
                <DeviceStatusBadge status={device.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
