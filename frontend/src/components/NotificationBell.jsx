import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useNotificationStore from '../store/notificationStore';

const typeColors = {
  balance: 'bg-green-100 text-green-700',
  sale: 'bg-blue-100 text-blue-700',
  voucher: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
  request: 'bg-yellow-100 text-yellow-700',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, markAllRead, clearAll, markRead } =
    useNotificationStore();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center rounded-full leading-none px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </span>
            <div className="flex gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    title="Marcar todas leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    title="Limpiar todo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${
                        typeColors[n.type] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(n.timestamp), "HH:mm · d MMM", { locale: es })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
