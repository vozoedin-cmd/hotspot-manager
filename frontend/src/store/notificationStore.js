import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotif = {
      id: Date.now(),
      read: false,
      timestamp: new Date().toISOString(),
      ...notification,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 50), // máx 50
      unreadCount: state.unreadCount + 1,
    }));
    return newNotif;
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useNotificationStore;
