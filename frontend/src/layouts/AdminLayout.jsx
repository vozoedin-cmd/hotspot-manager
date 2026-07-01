import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Ticket, Package, Users, Router,
  BarChart3, ShieldCheck, LogOut, Menu, X, Wifi, Wallet, Settings
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { sellersApi } from '../services/api';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket';
import NotificationBell from '../components/NotificationBell';
import NotificationBell from '../components/NotificationBell';
const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/vouchers', icon: Ticket, label: 'Fichas' },
  { to: '/admin/packages', icon: Package, label: 'Paquetes' },
  { to: '/admin/sellers', icon: Users, label: 'Vendedores' },
  { to: '/admin/balance-requests', icon: Wallet, label: 'Solicitudes', badge: true },
  { to: '/admin/mikrotik', icon: Router, label: 'MikroTik' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/audit', icon: ShieldCheck, label: 'Auditoría' },
  { to: '/admin/settings', icon: Settings, label: 'Seguridad' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  useSocket(user);

  const { data: countData } = useQuery({
    queryKey: ['balance-requests-count'],
    queryFn: () => sellersApi.getPendingRequestsCount().then(r => r.data),
    refetchInterval: 30000,
  });
  const pendingCount = countData?.count ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-glassBorder">
        <div className="bg-primary-500/20 p-2 rounded-lg shadow-glow-cyan">
          <Wifi className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">HotspotManager</h1>
          <p className="text-primary-300 text-xs">Panel Administrador</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                isActive
                  ? 'bg-primary-500/20 text-primary-400 font-semibold shadow-glow-cyan border border-primary-500/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-glassBorder pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-semibold text-sm flex-shrink-0 shadow-glow-cyan">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel border-r border-y-0 border-l-0 flex-shrink-0 z-10">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 glass-panel border-r border-y-0 border-l-0 z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-primary-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {/* Mobile header */}
        <header className="lg:hidden glass-panel border-b border-x-0 border-t-0 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Wifi className="w-5 h-5 text-white" />
            <span className="font-semibold text-white">HotspotManager</span>
          </div>
          <NotificationBell />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
