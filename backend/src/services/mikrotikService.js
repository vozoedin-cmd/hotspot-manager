/**
 * Servicio de integración con MikroTik RouterOS API
 * Compatible con RouterOS v6 y v7
 * Puerto API: 8728 (sin SSL) / 8729 (con SSL)
 */
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const logger = require('../config/logger');

class MikrotikService {
  constructor() {
    this.connections = new Map(); // Pool de conexiones activas
  }

  /**
   * Crear una conexión con un dispositivo MikroTik
   */
  async connect(device) {
    const key = device.id;

    // Reusar conexión existente si está activa
    if (this.connections.has(key)) {
      const existing = this.connections.get(key);
      if (existing.connected) return existing;
      this.connections.delete(key);
    }

    const conn = new RouterOSAPI({
      host: device.host,
      user: device.username,
      password: device.password,
      port: device.port || 8728,
      timeout: parseInt(process.env.MIKROTIK_TIMEOUT) || 5000,
      tls: device.use_ssl,
      keepalive: true,
    });

    try {
      await conn.connect();
      this.connections.set(key, conn);
      logger.info(`MikroTik conectado: ${device.name} [${device.host}]`);
      return conn;
    } catch (error) {
      logger.error(`Error conectando a MikroTik ${device.name}: ${error.message}`);
      throw new Error(`No se pudo conectar al dispositivo MikroTik: ${error.message}`);
    }
  }

  /**
   * Cerrar conexión con un dispositivo
   */
  async disconnect(deviceId) {
    if (this.connections.has(deviceId)) {
      try {
        const conn = this.connections.get(deviceId);
        conn.close();
        this.connections.delete(deviceId);
        logger.info(`Conexión MikroTik cerrada: ${deviceId}`);
      } catch (e) {
        this.connections.delete(deviceId);
      }
    }
  }

  /**
   * Obtener todos los usuarios del Hotspot
   */
  async getHotspotUsers(device) {
    const conn = await this.connect(device);
    try {
      const users = await conn.write('/ip/hotspot/user/print');
      return users;
    } catch (error) {
      logger.error(`Error obteniendo usuarios hotspot de ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener usuarios activos del Hotspot (conectados en este momento)
   */
  async getActiveHotspotUsers(device) {
    const conn = await this.connect(device);
    try {
      const active = await conn.write('/ip/hotspot/active/print');
      return active;
    } catch (error) {
      logger.error(`Error obteniendo usuarios activos de ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crear un usuario Hotspot en MikroTik
   */
  async createHotspotUser(device, userConfig) {
    const conn = await this.connect(device);
    const {
      username,
      password,
      profile = 'default',
      comment = '',
      server = null,
      limitUptime = null,
      limitBytesIn = 0,
      limitBytesOut = 0,
      limitBytesTotal = 0,
    } = userConfig;

    const params = [
      '=name=' + username,
      '=password=' + password,
      '=profile=' + profile,
      '=server=' + (server || device.hotspot_server || 'hotspot1'),
    ];

    if (comment) params.push('=comment=' + comment);
    if (limitUptime) params.push('=limit-uptime=' + limitUptime);
    if (limitBytesIn > 0) params.push('=limit-bytes-in=' + limitBytesIn);
    if (limitBytesOut > 0) params.push('=limit-bytes-out=' + limitBytesOut);
    if (limitBytesTotal > 0) params.push('=limit-bytes-total=' + limitBytesTotal);

    try {
      const result = await conn.write(['/ip/hotspot/user/add', ...params]);
      logger.info(`Usuario hotspot creado en ${device.name}: ${username} | uptime: ${limitUptime || 'sin límite'}`);
      return result;
    } catch (error) {
      logger.error(`Error creando usuario ${username} en ${device.name}: ${error.message}`);
      throw new Error(`Error al crear usuario en MikroTik: ${error.message}`);
    }
  }

  /**
   * Crear múltiples usuarios a la vez (lote)
   */
  async createHotspotUsersBatch(device, usersArray) {
    const results = [];
    const errors = [];

    for (const user of usersArray) {
      try {
        const result = await this.createHotspotUser(device, user);
        results.push({ username: user.username, success: true, result });
      } catch (error) {
        errors.push({ username: user.username, success: false, error: error.message });
      }
    }

    return { results, errors, total: usersArray.length };
  }

  /**
   * Eliminar un usuario Hotspot
   */
  async removeHotspotUser(device, mikrotikId) {
    const conn = await this.connect(device);
    try {
      await conn.write(['/ip/hotspot/user/remove', `=.id=${mikrotikId}`]);
      logger.info(`Usuario ${mikrotikId} eliminado de ${device.name}`);
    } catch (error) {
      logger.error(`Error eliminando usuario ${mikrotikId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deshabilitar un usuario Hotspot
   */
  async disableHotspotUser(device, mikrotikId) {
    const conn = await this.connect(device);
    try {
      await conn.write(['/ip/hotspot/user/set', `=.id=${mikrotikId}`, '=disabled=yes']);
      logger.info(`Usuario ${mikrotikId} deshabilitado en ${device.name}`);
    } catch (error) {
      logger.error(`Error deshabilitando usuario ${mikrotikId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Habilitar un usuario Hotspot
   */
  async enableHotspotUser(device, mikrotikId) {
    const conn = await this.connect(device);
    try {
      await conn.write(['/ip/hotspot/user/set', `=.id=${mikrotikId}`, '=disabled=no']);
      logger.info(`Usuario ${mikrotikId} habilitado en ${device.name}`);
    } catch (error) {
      logger.error(`Error habilitando usuario ${mikrotikId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desconectar sesión activa de un usuario
   */
  async disconnectActiveUser(device, activeId) {
    const conn = await this.connect(device);
    try {
      await conn.write(['/ip/hotspot/active/remove', `=.id=${activeId}`]);
      logger.info(`Sesión activa ${activeId} desconectada en ${device.name}`);
    } catch (error) {
      logger.error(`Error desconectando sesión ${activeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener perfiles del Hotspot disponibles en el router
   */
  async getHotspotProfiles(device) {
    const conn = await this.connect(device);
    try {
      const profiles = await conn.write('/ip/hotspot/user/profile/print');
      return profiles;
    } catch (error) {
      logger.error(`Error obteniendo perfiles de ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener servidores Hotspot configurados
   */
  async getHotspotServers(device) {
    const conn = await this.connect(device);
    try {
      const servers = await conn.write('/ip/hotspot/print');
      return servers;
    } catch (error) {
      logger.error(`Error obteniendo servidores hotspot de ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar estado de un usuario específico
   * Retorna el estado actual en MikroTik
   */
  async getUserStatus(device, username) {
    const conn = await this.connect(device);
    try {
      // Buscar en usuarios registrados
      const users = await conn.write([
        '/ip/hotspot/user/print',
        `?name=${username}`,
      ]);

      if (!users || users.length === 0) {
        return { exists: false, status: 'not_found' };
      }

      const user = users[0];

      // Buscar en sesiones activas
      const activeSessions = await conn.write([
        '/ip/hotspot/active/print',
        `?user=${username}`,
      ]);

      return {
        exists: true,
        disabled: user.disabled === 'true',
        bytesIn: parseInt(user['bytes-in']) || 0,
        bytesOut: parseInt(user['bytes-out']) || 0,
        uptime: user.uptime || '0s',
        isActive: activeSessions.length > 0,
        activeSession: activeSessions[0] || null,
        mikrotikData: user,
      };
    } catch (error) {
      logger.error(`Error obteniendo estado de usuario ${username}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Probar conexión con un dispositivo
   */
  async testConnection(device) {
    try {
      const conn = await this.connect(device);
      const identity = await conn.write('/system/identity/print');
      const resource = await conn.write('/system/resource/print');

      return {
        success: true,
        identity: identity[0]?.name,
        version: resource[0]?.version,
        uptime: resource[0]?.uptime,
        boardName: resource[0]?.['board-name'],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generar código único para una ficha
   */
  static generateVoucherCode(prefix = 'HS', length = 8, numbersOnly = false) {
    const chars = numbersOnly
      ? '23456789'  // Solo números sin confusos (0,1)
      : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos (0,O,I,1)
    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generar lote de códigos únicos
   */
  static generateVoucherBatch(count = 10, prefix = 'HS', length = 8, numbersOnly = false) {
    const codes = new Set();
    while (codes.size < count) {
      codes.add(MikrotikService.generateVoucherCode(prefix, length, numbersOnly));
    }
    return Array.from(codes);
  }
}

module.exports = new MikrotikService();
module.exports.MikrotikService = MikrotikService;
