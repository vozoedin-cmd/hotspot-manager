import { create } from 'zustand';
import { authApi } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Inicializar desde localStorage
  // Inicializar desde localStorage (MOCK PARA PRUEBAS SIN BACKEND)
  initialize: async () => {
    // Falsificar un usuario logueado para que puedas ver el dashboard
    set({ 
      user: { id: 1, name: 'Admin Modo Prueba', email: 'admin@prueba.com', role: 'admin' }, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },

  login: async (email, password, totpCode = null) => {
    // MOCK LOGIN PARA PRUEBAS
    const user = { id: 1, name: 'Admin Modo Prueba', email: 'admin@prueba.com', role: 'admin' };
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
