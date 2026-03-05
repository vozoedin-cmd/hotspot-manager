import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: agregar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejo de respuestas y refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
          const { access_token, refresh_token: newRefresh } = res.data;

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  // 2FA
  twoFAStatus: () => api.get('/auth/2fa/status'),
  twoFASetup: () => api.post('/auth/2fa/setup'),
  twoFAVerify: (data) => api.post('/auth/2fa/verify', data),
  twoFADisable: (data) => api.post('/auth/2fa/disable', data),
};

// ── Dashboard / Reportes ──────────────────────────
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  sellerDashboard: () => api.get('/reports/seller-dashboard'),
  sales: (params) => api.get('/reports/sales', { params }),
  salesBySeller: (params) => api.get('/reports/sales-by-seller', { params }),
  salesByPackage: (params) => api.get('/reports/sales-by-package', { params }),
};

// ── Paquetes ──────────────────────────────────────
export const packagesApi = {
  list: (params) => api.get('/packages', { params }),
  get: (id) => api.get(`/packages/${id}`),
  create: (data) => api.post('/packages', data),
  update: (id, data) => api.put(`/packages/${id}`, data),
  delete: (id) => api.delete(`/packages/${id}`),
};

// ── Fichas ────────────────────────────────────────
export const vouchersApi = {
  list: (params) => api.get('/vouchers', { params }),
  get: (id) => api.get(`/vouchers/${id}`),
  generate: (data) => api.post('/vouchers/generate', data),
  sell: (data) => api.post('/vouchers/sell', data),
  availableCount: (params) => api.get('/vouchers/available-count', { params }),
  disable: (id) => api.patch(`/vouchers/${id}/disable`),
};

// ── Vendedores ────────────────────────────────────
export const sellersApi = {
  list: (params) => api.get('/sellers', { params }),
  get: (id) => api.get(`/sellers/${id}`),
  me: () => api.get('/sellers/me'),
  create: (data) => api.post('/sellers', data),
  update: (id, data) => api.put(`/sellers/${id}`, data),
  reloadBalance: (id, data) => api.post(`/sellers/${id}/reload-balance`, data),
  transactions: (id, params) => api.get(`/sellers/${id}/transactions`, { params }),
  myTransactions: (params) => api.get('/sellers/me/transactions', { params }),
  // Balance Requests
  requestBalance: (data) => api.post('/sellers/balance-request', data),
  getMyBalanceRequests: () => api.get('/sellers/my-balance-requests'),
  getBalanceRequests: (params) => api.get('/sellers/balance-requests', { params }),
  getPendingRequestsCount: () => api.get('/sellers/balance-requests/count'),
  getSellerRequests: (id) => api.get(`/sellers/${id}/balance-requests`),
  approveRequest: (id, data) => api.post(`/sellers/balance-requests/${id}/approve`, data),
  rejectRequest: (id, data) => api.post(`/sellers/balance-requests/${id}/reject`, data),
};

// ── MikroTik ──────────────────────────────────────
export const mikrotikApi = {
  list: () => api.get('/mikrotik'),
  get: (id) => api.get(`/mikrotik/${id}`),
  create: (data) => api.post('/mikrotik', data),
  update: (id, data) => api.put(`/mikrotik/${id}`, data),
  test: (id) => api.post(`/mikrotik/${id}/test`),
  sync: (id) => api.post(`/mikrotik/${id}/sync`),
  activeUsers: (id) => api.get(`/mikrotik/${id}/active-users`),
  profiles: (id) => api.get(`/mikrotik/${id}/profiles`),
  delete: (id) => api.delete(`/mikrotik/${id}`),  setupVpnForward: (data) => api.post('/mikrotik/setup-vpn-forward', data),};

// ── Ventas ────────────────────────────────────────
export const salesApi = {
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
};

export default api;
