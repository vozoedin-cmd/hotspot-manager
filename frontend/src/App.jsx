import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import SellerLayout from './layouts/SellerLayout';

// Auth
import LoginPage from './pages/LoginPage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import VouchersPage from './pages/admin/VouchersPage';
import GenerateVouchersPage from './pages/admin/GenerateVouchersPage';
import PackagesPage from './pages/admin/PackagesPage';
import SellersPage from './pages/admin/SellersPage';
import SellerDetailPage from './pages/admin/SellerDetailPage';
import BalanceRequestsPage from './pages/admin/BalanceRequestsPage';
import MikrotikDevicesPage from './pages/admin/MikrotikDevicesPage';
import ReportsPage from './pages/admin/ReportsPage';
import AuditPage from './pages/admin/AuditPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Seller Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellVoucherPage from './pages/seller/SellVoucherPage';
import SalesHistoryPage from './pages/seller/SalesHistoryPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';

// Guards
const RequireAuth = ({ children, role }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to={user?.role === 'admin' ? '/admin' : '/seller'} replace />
              : <LoginPage />
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="vouchers/generate" element={<GenerateVouchersPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="sellers" element={<SellersPage />} />
          <Route path="sellers/:id" element={<SellerDetailPage />} />
          <Route path="balance-requests" element={<BalanceRequestsPage />} />
          <Route path="mikrotik" element={<MikrotikDevicesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Seller Routes */}
        <Route
          path="/seller"
          element={
            <RequireAuth>
              <SellerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<SellerDashboardPage />} />
          <Route path="sell" element={<SellVoucherPage />} />
          <Route path="history" element={<SalesHistoryPage />} />
          <Route path="profile" element={<SellerProfilePage />} />
        </Route>

        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated
              ? <Navigate to={user?.role === 'admin' ? '/admin' : '/seller'} replace />
              : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
