const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Voucher, Package, MikrotikDevice, User, Sale } = require('../models');
const voucherService = require('../services/voucherService');
const mikrotikService = require('../services/mikrotikService');
const logger = require('../config/logger');

/**
 * GET /api/vouchers - Listar fichas con filtros
 */
const listVouchers = async (req, res, next) => {
  try {
    const {
      status, package_id, device_id, seller_id,
      batch_id, page = 1, limit = 50, code,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (package_id) where.package_id = package_id;
    if (device_id) where.device_id = device_id;
    if (batch_id) where.batch_id = batch_id;
    if (code) where.code = { [Op.iLike]: `%${code}%` };

    // Los vendedores solo ven sus fichas
    if (req.user.role === 'seller') {
      where.seller_id = req.user.id;
    } else if (seller_id) {
      where.seller_id = seller_id;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Voucher.findAndCountAll({
      where,
      include: [
        { model: Package, as: 'package', attributes: ['id', 'name', 'price', 'duration_value', 'duration_unit'] },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 200),
      offset,
    });

    return res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vouchers/:id - Detalle de una ficha
 */
const getVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id, {
      include: [
        { model: Package, as: 'package' },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Sale, as: 'sale' },
      ],
    });

    if (!voucher) return res.status(404).json({ error: 'Ficha no encontrada' });

    // Vendedores solo ven sus fichas
    if (req.user.role === 'seller' && voucher.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    return res.json({ data: voucher });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vouchers/generate - Generar lote de fichas (admin)
 */
const generateVouchers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { device_id, package_id, quantity, prefix, voucher_type, code_length, pwd_length, numbers_only } = req.body;

    const result = await voucherService.generateBatch({
      deviceId: device_id,
      packageId: package_id,
      quantity: Math.min(quantity, 500),
      prefix: prefix ?? '',
      voucherType: voucher_type || 'user_password',
      codeLength: parseInt(code_length) || 6,
      pwdLength: parseInt(pwd_length) || 6,
      numbersOnly: numbers_only === true || numbers_only === 'true',
      createdBy: req.user.id,
    });

    // Notificar por socket
    const io = req.app.get('io');
    if (io) {
      io.emit('vouchers_generated', {
        batch_id: result.batchId,
        count: result.created,
        package_id,
        device_id,
      });
    }

    logger.info(`Lote generado por ${req.user.email}: ${result.created} fichas`);

    return res.status(201).json({
      message: `Se generaron ${result.created} fichas exitosamente`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vouchers/sell - Vender una ficha (vendedor)
 */
const sellVoucher = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { package_id, device_id, client_name } = req.body;

    const result = await voucherService.sellVoucher({
      packageId: package_id,
      deviceId: device_id || null,
      sellerId: req.user.id,
      clientName: client_name,
    });

    // Notificar por socket
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('voucher_sold', {
        voucher_code: result.voucher.code,
        seller: req.user.name,
        package: result.voucher.package?.name,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      message: 'Ficha vendida exitosamente',
      data: {
        voucher: {
          id: result.voucher.id,
          code: result.voucher.code,
          password: result.voucher.password,
          voucher_type: result.voucher.voucher_type ?? 'user_password',
          package: result.voucher.package,
        },
        sale_id: result.sale.id,
        balance_remaining: result.balance_remaining,
      },
    });
  } catch (error) {
    if (error.message.includes('Saldo insuficiente') || error.message.includes('No hay fichas')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/vouchers/available-count - Fichas disponibles por paquete
 */
const getAvailableCount = async (req, res, next) => {
  try {
    const { package_id, device_id } = req.query;
    if (!package_id) return res.status(400).json({ error: 'package_id requerido' });

    // Si es vendedor con dispositivo asignado, filtrar por ese dispositivo
    const effectiveDeviceId = device_id ||
      (req.user.role === 'seller' && req.user.device_id ? req.user.device_id : null);

    const result = await voucherService.getAvailableVouchers(package_id, effectiveDeviceId);
    return res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/vouchers/:id/disable - Deshabilitar ficha (admin)
 */
const disableVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id, {
      include: [{ model: MikrotikDevice, as: 'device' }],
    });

    if (!voucher) return res.status(404).json({ error: 'Ficha no encontrada' });

    await voucher.update({ status: 'disabled' });

    // Deshabilitar también en MikroTik si tiene ID
    if (voucher.mikrotik_id && voucher.device) {
      await mikrotikService.disableHotspotUser(voucher.device, voucher.mikrotik_id).catch(e => {
        logger.warn(`No se pudo deshabilitar en MikroTik: ${e.message}`);
      });
    }

    return res.json({ message: 'Ficha deshabilitada', data: voucher });
  } catch (error) {
    next(error);
  }
};

// Validaciones
const generateValidation = [
  body('device_id').isUUID().withMessage('device_id inválido'),
  body('package_id').isUUID().withMessage('package_id inválido'),
  body('quantity').isInt({ min: 1, max: 500 }).withMessage('Cantidad entre 1 y 500'),
  body('voucher_type').optional().isIn(['pin', 'user_password']).withMessage('Tipo inválido'),
  body('code_length').optional().isInt({ min: 4, max: 12 }).withMessage('Longitud de código entre 4 y 12'),
  body('pwd_length').optional().isInt({ min: 4, max: 12 }).withMessage('Longitud de contraseña entre 4 y 12'),
];

const sellValidation = [
  body('package_id').isUUID().withMessage('package_id inválido'),
];

module.exports = {
  listVouchers,
  getVoucher,
  generateVouchers,
  sellVoucher,
  getAvailableCount,
  disableVoucher,
  generateValidation,
  sellValidation,
};
