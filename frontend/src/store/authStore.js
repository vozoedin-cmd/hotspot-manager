import { create } from 'zustand';
import { authApi } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Inicializar desde localStorage
  initialize: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await authApi.me();
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.clear();
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    const { access_token, refresh_token, user } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch { /* ignorar */ }
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
}));

export default useAuthStore;
