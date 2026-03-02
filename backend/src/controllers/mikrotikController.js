const { body, validationResult } = require('express-validator');
const { MikrotikDevice } = require('../models');
const mikrotikService = require('../services/mikrotikService');
const syncService = require('../services/syncService');
const logger = require('../config/logger');

/**
 * GET /api/mikrotik - Listar dispositivos
 */
const listDevices = async (req, res, next) => {
  try {
    const devices = await MikrotikDevice.findAll({
      where: { is_active: true },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
    });
    return res.json({ data: devices });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mikrotik/:id
 */
const getDevice = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    return res.json({ data: device });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mikrotik - Crear dispositivo (admin)
 */
const createDevice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const device = await MikrotikDevice.create(req.body);

    logger.info(`Dispositivo MikroTik creado: ${device.name} [${device.host}] por ${req.user.email}`);

    // Probar conexión inmediatamente
    const testResult = await mikrotikService.testConnection(device);
    await device.update({ status: testResult.success ? 'online' : 'error' });

    return res.status(201).json({
      message: 'Dispositivo creado',
      data: device,
      connection_test: testResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/mikrotik/:id - Actualizar dispositivo
 */
const updateDevice = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    // Cerrar conexión antigua si cambió host/credenciales
    if (req.body.host !== device.host || req.body.password) {
      await mikrotikService.disconnect(device.id);
    }

    await device.update(req.body);
    return res.json({ message: 'Dispositivo actualizado', data: device });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mikrotik/:id/test - Probar conexión
 */
const testConnection = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    await mikrotikService.disconnect(device.id); // Forzar nueva conexión
    const result = await mikrotikService.testConnection(device);

    await device.update({ status: result.success ? 'online' : 'error' });

    return res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mikrotik/:id/sync - Sincronizar fichas del dispositivo
 */
const syncDevice = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const changes = await syncService.syncDevice(device);

    const io = req.app.get('io');
    if (io && changes.length > 0) {
      io.emit('voucher_sync', { changes, device_id: device.id });
    }

    return res.json({
      message: `Sincronización completada: ${changes.length} cambios`,
      data: { changes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mikrotik/:id/active-users - Usuarios activos en el router
 */
const getActiveUsers = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const activeUsers = await mikrotikService.getActiveHotspotUsers(device);

    return res.json({ data: activeUsers, count: activeUsers.length });
  } catch (error) {
    if (error.message.includes('No se pudo conectar')) {
      return res.status(503).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/mikrotik/:id/profiles - Perfiles del router
 */
const getProfiles = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const profiles = await mikrotikService.getHotspotProfiles(device);
    return res.json({ data: profiles });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/mikrotik/:id - Eliminar dispositivo
 */
const deleteDevice = async (req, res, next) => {
  try {
    const device = await MikrotikDevice.findByPk(req.params.id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    await mikrotikService.disconnect(device.id);
    await device.update({ is_active: false });

    return res.json({ message: 'Dispositivo desactivado' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mikrotik/setup-vpn-forward
 * Usa el API de un router gateway (online) para crear una regla dst-nat
 * que reenvíe un puerto hacia el IP VPN de un router remoto.
 */
const setupVpnForward = async (req, res, next) => {
  try {
    const { gateway_id, remote_vpn_ip, forward_port, ppp_username, remote_api_port } = req.body;

    if (!gateway_id || !remote_vpn_ip || !forward_port) {
      return res.status(400).json({ error: 'gateway_id, remote_vpn_ip y forward_port son requeridos' });
    }

    const gateway = await MikrotikDevice.findByPk(gateway_id);
    if (!gateway) return res.status(404).json({ error: 'Router gateway no encontrado' });

    const conn = await mikrotikService.connect(gateway);

    const apiPort = remote_api_port || 8728;
    const comment = `VPN-NAT-${remote_vpn_ip.replace(/\./g, '_')}-${forward_port}`;

    // Verificar si ya existe la regla para evitar duplicados
    const existing = await conn.write('/ip/firewall/nat/print', [
      `?dst-port=${forward_port}`,
      '?chain=dstnat',
    ]);

    if (existing && existing.length > 0) {
      // Actualizar la existente
      await conn.write('/ip/firewall/nat/set', [
        `=.id=${existing[0]['.id']}`,
        `=to-addresses=${remote_vpn_ip}`,
        `=to-ports=${apiPort}`,
        `=comment=${comment}`,
      ]);
      logger.info(`NAT rule updated: port ${forward_port} -> ${remote_vpn_ip}:${apiPort}`);
    } else {
      // Crear nueva regla
      await conn.write('/ip/firewall/nat/add', [
        '=chain=dstnat',
        '=protocol=tcp',
        `=dst-port=${forward_port}`,
        '=action=dst-nat',
        `=to-addresses=${remote_vpn_ip}`,
        `=to-ports=${apiPort}`,
        `=comment=${comment}`,
      ]);
      logger.info(`NAT rule created: port ${forward_port} -> ${remote_vpn_ip}:${apiPort}`);
    }

    // Opcional: fijar IP estática al cliente PPP para que no cambie
    if (ppp_username) {
      try {
        const secrets = await conn.write('/ppp/secret/print', [`?name=${ppp_username}`]);
        if (secrets && secrets.length > 0) {
          await conn.write('/ppp/secret/set', [
            `=.id=${secrets[0]['.id']}`,
            `=remote-address=${remote_vpn_ip}`,
          ]);
          logger.info(`PPP secret ${ppp_username} fixed to ${remote_vpn_ip}`);
        }
      } catch (e) {
        logger.warn(`No se pudo fijar IP PPP: ${e.message}`);
      }
    }

    return res.json({
      message: `Regla NAT configurada: puerto ${forward_port} → ${remote_vpn_ip}:${apiPort}`,
      data: { forward_port, remote_vpn_ip, api_port: apiPort },
    });
  } catch (error) {
    next(error);
  }
};

const deviceValidation = [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('host').notEmpty().withMessage('Host/IP requerido'),
  body('username').notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Puerto inválido'),
];

module.exports = {
  listDevices, getDevice, createDevice, updateDevice,
  testConnection, syncDevice, getActiveUsers, getProfiles,
  deleteDevice, setupVpnForward, deviceValidation,
};
