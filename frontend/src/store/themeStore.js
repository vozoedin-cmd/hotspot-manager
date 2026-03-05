import { create } from 'zustand';

const useThemeStore = create((set) => ({
  isDark: false,

  init: () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ isDark });
  },

  toggle: () =>
    set((state) => {
      const isDark = !state.isDark;
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return { isDark };
    }),
}));

export default useThemeStore;
