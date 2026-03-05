import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from '../services/socketService';
import useNotificationStore from '../store/notificationStore';

/**
 * Hook que conecta el socket y escucha todos los eventos en tiempo real.
 * Llamar UNA VEZ en el layout raíz después del login.
 */
export default function useSocket(user) {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!user?.id) return;

    const socket = connectSocket(user.id, user.role);

    // ─── Evento: recarga de saldo (vendedor) ─────────────────────────────────
    socket.on('balance_updated', (data) => {
      addNotification({
        type: 'balance',
        title: '💰 Saldo recargado',
        message: data.message || `Nuevo saldo: Q${Number(data.balance).toFixed(2)}`,
      });
      toast.success(data.message || 'Tu saldo fue actualizado', { duration: 5000 });
      // Refrescar los datos del dashboard del vendedor
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard'] });
    });

    // ─── Evento: venta registrada (admin) ────────────────────────────────────
    socket.on('voucher_sold', (data) => {
      addNotification({
        type: 'sale',
        title: '🎫 Nueva venta',
        message: `${data.seller} vendió un voucher de ${data.package ?? 'paquete'}`,
      });
      // Refrescar dashboard y reportes
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
    });

    // ─── Evento: lote de fichas generado (admin) ─────────────────────────────
    socket.on('vouchers_generated', (data) => {
      addNotification({
        type: 'voucher',
        title: '✅ Fichas generadas',
        message: `Se generaron ${data.count} fichas nuevas`,
      });
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
    });

    // ─── Evento: estado del router MikroTik ──────────────────────────────────
    socket.on('device_status_changed', (data) => {
      const isOnline = data.status === 'online';
      addNotification({
        type: isOnline ? 'success' : 'error',
        title: isOnline ? '🟢 Router en línea' : '🔴 Router desconectado',
        message: `${data.device_name ?? 'Dispositivo'} está ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['mikrotik-devices'] });
    });

    // ─── Evento: solicitud de saldo enviada (admin) ───────────────────────────
    socket.on('balance_request_created', (data) => {
      addNotification({
        type: 'request',
        title: '📬 Solicitud de saldo',
        message: `${data.sellerName ?? data.seller_name ?? 'Vendedor'} solicita Q${Number(data.amount).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['balance-requests-count'] });
      queryClient.invalidateQueries({ queryKey: ['balance-requests'] });
    });

    return () => {
      socket.off('balance_updated');
      socket.off('voucher_sold');
      socket.off('vouchers_generated');
      socket.off('device_status_changed');
      socket.off('balance_request_created');
      disconnectSocket();
    };
  }, [user?.id, user?.role]);
}
