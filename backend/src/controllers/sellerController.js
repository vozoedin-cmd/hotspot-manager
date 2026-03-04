const { body, validationResult } = require('express-validator');
const { User, SellerBalance, Transaction, Sale } = require('../models');
const voucherService = require('../services/voucherService');
const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * GET /api/sellers - Listar vendedores (admin)
 */
const listSellers = async (req, res, next) => {
  try {
    const { is_active, search } = req.query;
    const where = { role: 'seller' };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { MikrotikDevice } = require('../models');
    const sellers = await User.findAll({
      where,
      include: [
        { model: SellerBalance, as: 'balance' },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'], required: false },
      ],
      order: [['name', 'ASC']],
    });

    return res.json({ data: sellers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sellers/:id - Detalle de vendedor
 */
const getSeller = async (req, res, next) => {
  try {
    const id = req.user.role === 'seller' ? req.user.id : req.params.id;

    const { MikrotikDevice } = require('../models');
    const seller = await User.findOne({
      where: { id, role: 'seller' },
      include: [
        { model: SellerBalance, as: 'balance' },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'], required: false },
      ],
    });

    if (!seller) return res.status(404).json({ error: 'Vendedor no encontrado' });

    return res.json({ data: seller });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sellers - Crear vendedor (admin)
 */
const createSeller = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, phone, monthly_limit = 2000, device_id } = req.body;

    const t = await sequelize.transaction();
    try {
      const seller = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        phone,
        role: 'seller',
      }, { transaction: t });

      await SellerBalance.create({
        seller_id: seller.id,
        balance: 0,
        monthly_limit,
      }, { transaction: t });

      await t.commit();

      // Asignar device_id con SQL nativo
      if (device_id) {
        await sequelize.query(
          'UPDATE users SET device_id = $1 WHERE id = $2',
          { bind: [device_id, seller.id], type: QueryTypes.UPDATE }
        );
      }

      const { MikrotikDevice } = require('../models');
      const result = await User.findByPk(seller.id, {
        include: [
          { model: SellerBalance, as: 'balance' },
          { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'], required: false },
        ],
      });

      logger.info(`Vendedor creado por ${req.user.email}: ${email}`);
      return res.status(201).json({ message: 'Vendedor creado exitosamente', data: result });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/sellers/:id - Actualizar vendedor (admin)
 */
const updateSeller = async (req, res, next) => {
  try {
    const { name, phone, is_active, monthly_limit, device_id } = req.body;

    const { MikrotikDevice } = require('../models');
    const seller = await User.findOne({
      where: { id: req.params.id, role: 'seller' },
      include: [{ model: SellerBalance, as: 'balance' }],
    });

    if (!seller) return res.status(404).json({ error: 'Vendedor no encontrado' });

    // Actualizar campos básicos
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;
    await seller.update(updateData);

    // Actualizar device_id con SQL nativo (más confiable que ORM para FK con belongsTo)
    if (device_id !== undefined) {
      await sequelize.query(
        'UPDATE users SET device_id = $1 WHERE id = $2',
        { bind: [device_id || null, req.params.id], type: QueryTypes.UPDATE }
      );
    }

    if (monthly_limit !== undefined && seller.balance) {
      await seller.balance.update({ monthly_limit });
    }

    logger.info(`Vendedor ${seller.email} actualizado por ${req.user.email}`);
    return res.json({ message: 'Vendedor actualizado', data: await User.findByPk(seller.id, {
      include: [
        { model: SellerBalance, as: 'balance' },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'], required: false },
      ],
    }) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sellers/:id/reload-balance - Recargar saldo (admin)
 */
const reloadBalance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, description } = req.body;

    const result = await voucherService.reloadSellerBalance({
      sellerId: req.params.id,
      amount: parseFloat(amount),
      adminId: req.user.id,
      description,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`seller_${req.params.id}`).emit('balance_updated', {
        balance: result.balance_after,
        message: `Saldo recargado: +Q${amount}`,
      });
    }

    return res.json({
      message: `Saldo recargado: Q${amount}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sellers/:id/transactions - Historial de transacciones
 */
const getTransactions = async (req, res, next) => {
  try {
    const id = req.user.role === 'seller' ? req.user.id : req.params.id;
    const { page = 1, limit = 30 } = req.query;

    const { count, rows } = await Transaction.findAndCountAll({
      where: { seller_id: id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Validaciones
const createSellerValidation = [
  body('name').notEmpty().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('monthly_limit').optional().isFloat({ min: 0 }).withMessage('Límite mensual inválido'),
];

const reloadBalanceValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
];

module.exports = {
  listSellers,
  getSeller,
  createSeller,
  updateSeller,
  reloadBalance,
  getTransactions,
  createSellerValidation,
  reloadBalanceValidation,
};
