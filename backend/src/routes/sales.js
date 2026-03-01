const express = require('express');
const router = express.Router();
const { Sale, Voucher, Package, User, MikrotikDevice } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(authenticate);

/**
 * GET /api/sales - Historial de ventas del vendedor o admin
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const where = {};

    if (req.user.role === 'seller') {
      where.seller_id = req.user.id;
    }

    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: Package, as: 'package', attributes: ['id', 'name', 'duration_value', 'duration_unit'] },
        { model: Voucher, as: 'voucher', attributes: ['id', 'code', 'status'] },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 100),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sales/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role === 'seller') where.seller_id = req.user.id;

    const sale = await Sale.findOne({
      where,
      include: [
        { model: Package, as: 'package' },
        { model: Voucher, as: 'voucher' },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

    return res.json({ data: sale });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
