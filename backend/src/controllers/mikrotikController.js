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
  deleteDevice, deviceValidation,
};
