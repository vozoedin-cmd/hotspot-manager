import { create } from 'zustand';

const useThemeStore = create((set) => ({
  isDark: true, // Always true for Glassmorphism Cyan theme

  init: () => {
    document.documentElement.classList.add('dark');
    set({ isDark: true });
  },

  toggle: () => {
    // Theme toggle disabled for this specific theme as it requires a dark background
  },
}));

export default useThemeStore;
