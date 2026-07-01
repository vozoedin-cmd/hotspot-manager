import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, History, User, LogOut, Wifi, Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/seller', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/seller/sell', icon: ShoppingCart, label: 'Vender Ficha' },
  { to: '/seller/history', icon: History, label: 'Mis Ventas' },
  { to: '/seller/profile', icon: User, label: 'Mi Perfil' },
];

export default function SellerLayout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  useSocket(user);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="cuzo-panel bg-white dark:bg-cuzo-sidebar text-gray-900 dark:text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-200 dark:border-darkborder border-x-0 border-t-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-500" />
          <span className="font-bold text-sm text-gray-900 dark:text-white">HotspotManager</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold">{user?.name}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Vendedor</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md cuzo-panel bg-white dark:bg-cuzo-sidebar border-t border-gray-200 dark:border-darkborder flex justify-around safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-none z-10">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 flex-1 text-xs transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
