import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, History, User, LogOut, Wifi, Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket';
import NotificationBell from '../components/NotificationBell';
import useThemeStore from '../store/themeStore';

const navItems = [
  { to: '/seller', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/seller/sell', icon: ShoppingCart, label: 'Vender Ficha' },
  { to: '/seller/history', icon: History, label: 'Mis Ventas' },
  { to: '/seller/profile', icon: User, label: 'Mi Perfil' },
];

export default function SellerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  useSocket(user);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          <span className="font-bold text-sm">HotspotManager</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold">{user?.name}</p>
            <p className="text-xs text-blue-200">Vendedor</p>
          </div>
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
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
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around safe-bottom shadow-lg z-10">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 flex-1 text-xs transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
