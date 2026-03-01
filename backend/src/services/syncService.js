/**
 * Servicio de Sincronización Bidireccional VPS <-> MikroTik
 * Ejecuta sincronización periódica (cron) y en tiempo real (socket.io)
 */
const cron = require('node-cron');
const { Op } = require('sequelize');
const { MikrotikDevice, Voucher, Package } = require('../models');
const mikrotikService = require('./mikrotikService');
const logger = require('../config/logger');

class SyncService {
  constructor() {
    this.cronJob = null;
    this.isSyncing = false;
  }

  /**
   * Iniciar el scheduler de sincronización
   */
  startScheduler(io) {
    const intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES) || 5;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      logger.info('Iniciando sincronización programada con MikroTik...');
      const changes = await this.syncAllDevices();

      // Emitir cambios por socket.io
      if (io && changes.length > 0) {
        io.emit('voucher_sync', { changes, timestamp: new Date().toISOString() });
      }
    });

    logger.info(`Scheduler de sincronización iniciado (cada ${intervalMinutes} minutos)`);
  }

  /**
   * Sincronizar todos los dispositivos activos
   */
  async syncAllDevices() {
    if (this.isSyncing) {
      logger.warn('Sincronización ya en progreso, omitiendo...');
      return [];
    }

    this.isSyncing = true;
    const allChanges = [];

    try {
      const devices = await MikrotikDevice.findAll({
        where: { is_active: true },
      });

      for (const device of devices) {
        try {
          const changes = await this.syncDevice(device);
          allChanges.push(...changes);
        } catch (error) {
          logger.error(`Error sincronizando dispositivo ${device.name}: ${error.message}`);
          await device.update({ status: 'error' });
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return allChanges;
  }

  /**
   * Sincronizar un dispositivo específico
   */
  async syncDevice(device) {
    const changes = [];

    try {
      // Probar conectividad
      const testResult = await mikrotikService.testConnection(device);
      if (!testResult.success) {
        await device.update({ status: 'offline' });
        logger.warn(`Dispositivo ${device.name} offline: ${testResult.error}`);
        return changes;
      }

      await device.update({ status: 'online', last_sync: new Date() });

      // Obtener usuarios activos en MikroTik
      const activeUsers = await mikrotikService.getActiveHotspotUsers(device);
      const activeUsernames = new Set(activeUsers.map(u => u.user));

      // Obtener todos los usuarios (para detectar expirados/eliminados)
      const allMikrotikUsers = await mikrotikService.getHotspotUsers(device);
      const mikrotikUsernames = new Set(allMikrotikUsers.map(u => u.name));

      // Actualizar fichas vendidas/activas
      const soldVouchers = await Voucher.findAll({
        where: {
          device_id: device.id,
          status: { [Op.in]: ['sold', 'active'] },
        },
      });

      for (const voucher of soldVouchers) {
        let newStatus = voucher.status;
        let updateData = {};

        if (!mikrotikUsernames.has(voucher.code)) {
          // El usuario fue eliminado en MikroTik
          newStatus = 'used';
          updateData = { status: 'used', used_at: new Date() };
          changes.push({ type: 'expired', voucher: voucher.code, device: device.name });
        } else if (activeUsernames.has(voucher.code)) {
          // El usuario está activo ahora
          if (voucher.status !== 'active') {
            newStatus = 'active';
            updateData = { status: 'active', activated_at: voucher.activated_at || new Date() };
            changes.push({ type: 'activated', voucher: voucher.code, device: device.name });
          }

          // Actualizar datos de uso
          const activeData = activeUsers.find(u => u.user === voucher.code);
          if (activeData) {
            updateData = {
              ...updateData,
              uptime: activeData.uptime,
              bytes_in: parseInt(activeData['bytes-in']) || 0,
              bytes_out: parseInt(activeData['bytes-out']) || 0,
              client_ip: activeData.address,
              client_mac: activeData['mac-address'],
            };
          }
        } else if (voucher.status === 'active') {
          // Estaba activo pero ya no lo está (se desconectó - no necesariamente expiró)
          const mtUser = allMikrotikUsers.find(u => u.name === voucher.code);
          if (mtUser && mtUser.disabled === 'true') {
            newStatus = 'used';
            updateData = { status: 'used', used_at: new Date() };
            changes.push({ type: 'used', voucher: voucher.code, device: device.name });
          }
        }

        if (Object.keys(updateData).length > 0) {
          await voucher.update(updateData);
        }
      }

      logger.info(`Sync completado: ${device.name} | ${changes.length} cambios | ${activeUsers.length} activos`);
    } catch (error) {
      logger.error(`Error en syncDevice ${device.name}: ${error.message}`);
      await device.update({ status: 'error' });
    }

    return changes;
  }

  /**
   * Detener el scheduler
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler de sincronización detenido');
    }
  }
}

module.exports = new SyncService();
