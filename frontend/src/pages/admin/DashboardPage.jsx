import { useQuery } from '@tanstack/react-query';
import { reportsApi, mikrotikApi } from '../../services/api';
import {
  Ticket, Users, Router, TrendingUp, CheckCircle,
  XCircle, Clock, DollarSign, RefreshCw, Wifi,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', loading }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-gray-900 ${loading ? 'opacity-40' : ''}`}>
            {loading ? '–' : value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
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

export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Datos actualizados');
  };

  const vouchers = data?.vouchers || {};
  const revenue = data?.revenue || {};
  const sellers = data?.sellers || {};

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Ventas hoy</p>
              <p className="text-3xl font-bold mt-1">
                Q{revenue.today?.toFixed(2) || '0.00'}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-200 opacity-60" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ventas este mes</p>
              <p className="text-3xl font-bold mt-1">
                Q{revenue.this_month?.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-200 opacity-60" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Fichas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard title="Total" value={vouchers.total || 0} icon={Ticket} color="blue" loading={isLoading} />
          <StatCard title="Disponibles" value={vouchers.available || 0} icon={CheckCircle} color="green" loading={isLoading} />
          <StatCard title="Vendidas" value={vouchers.sold || 0} icon={DollarSign} color="yellow" loading={isLoading} />
          <StatCard title="Activas" value={vouchers.active || 0} icon={Wifi} color="indigo" loading={isLoading} />
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
        <StatCard title="Routers" value={data?.devices?.length || 0} icon={Router} color="blue" loading={isLoading} />
        <StatCard
          title="En línea"
          value={data?.devices?.filter(d => d.status === 'online').length || 0}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
      </div>

      {/* Devices Status */}
      {data?.devices?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado de Routers MikroTik</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.devices.map((device) => (
              <div key={device.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Router className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{device.name}</p>
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
