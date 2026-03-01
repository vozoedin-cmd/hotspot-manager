import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsApi, salesApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wallet, ShoppingCart, TrendingUp, Zap } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const { user } = useAuthStore();

  const { data: dash } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => reportsApi.sellerDashboard().then((r) => r.data),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () =>
      salesApi.list({ limit: 5, page: 1 }).then((r) => r.data),
  });

  const sales = recentSales?.sales ?? recentSales?.rows ?? [];
  const balance = dash?.balance ?? 0;
  const monthlyLimit = dash?.monthlyLimit ?? 2000;
  const todaySales = dash?.todaySales ?? 0;
  const monthSales = dash?.monthSales ?? 0;

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          ¡Hola, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-500">
          {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg">
        <p className="text-sm opacity-80">Saldo disponible</p>
        <p className="text-4xl font-extrabold mt-1">
          Q{Number(balance).toFixed(2)}
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs opacity-75 mb-1">
            <span>Usado este mes</span>
            <span>Q{Number(monthlyLimit - balance).toFixed(2)} / Q{Number(monthlyLimit).toFixed(2)}</span>
          </div>
          <div className="h-1.5 bg-blue-400 rounded-full">
            <div
              className="h-1.5 bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, ((monthlyLimit - balance) / monthlyLimit) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ShoppingCart} label="Ventas hoy" value={todaySales} color="green" />
        <StatCard icon={TrendingUp} label="Ventas mes" value={monthSales} color="purple" />
      </div>

      {/* Quick sell CTA */}
      <Link
        to="/seller/sell"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg shadow transition"
      >
        <Zap className="w-5 h-5" />
        Vender Ficha
      </Link>

      {/* Recent sales */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Ventas recientes</h2>
          <Link to="/seller/sales" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
        </div>
        {sales.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin ventas registradas aún</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {sales.map((sale) => (
              <li key={sale.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sale.voucher?.package?.name ?? 'Paquete'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {sale.client_name || 'Cliente'} — {format(new Date(sale.created_at || sale.createdAt), 'dd/MM HH:mm')}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600">Q{Number(sale.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
