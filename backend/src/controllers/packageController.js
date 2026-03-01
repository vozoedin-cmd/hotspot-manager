const { body, validationResult } = require('express-validator');
const { Package, Voucher } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/packages - Listar paquetes
 */
const listPackages = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const packages = await Package.findAll({
      where,
      order: [['price', 'ASC']],
    });

    // Agregar conteo de fichas disponibles a cada paquete
    const withCounts = await Promise.all(
      packages.map(async (pkg) => {
        const available = await Voucher.count({
          where: { package_id: pkg.id, status: 'available' },
        });
        const pObj = pkg.toJSON();
        pObj.available_count = available;
        pObj.duration_label = pkg.getDurationLabel();
        return pObj;
      })
    );

    return res.json({ data: withCounts });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/packages/:id
 */
const getPackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });

    const available = await Voucher.count({
      where: { package_id: pkg.id, status: 'available' },
    });

    return res.json({ data: { ...pkg.toJSON(), available_count: available } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/packages - Crear paquete (admin)
 */
const createPackage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const pkg = await Package.create(req.body);
    return res.status(201).json({ message: 'Paquete creado', data: pkg });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/packages/:id - Actualizar paquete (admin)
 */
const updatePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });

    await pkg.update(req.body);
    return res.json({ message: 'Paquete actualizado', data: pkg });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/packages/:id - Eliminar paquete (admin, solo si no tiene fichas)
 */
const deletePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });

    const voucherCount = await Voucher.count({ where: { package_id: pkg.id } });
    if (voucherCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar. Tiene ${voucherCount} fichas asociadas. Desactívalo en su lugar.`,
      });
    }

    await pkg.destroy();
    return res.json({ message: 'Paquete eliminado' });
  } catch (error) {
    next(error);
  }
};

const packageValidation = [
  body('name').notEmpty().isLength({ min: 2, max: 100 }).withMessage('Nombre requerido'),
  body('duration_value').isInt({ min: 1 }).withMessage('Duración inválida'),
  body('duration_unit').isIn(['minutes', 'hours', 'days', 'weeks', 'months']).withMessage('Unidad de duración inválida'),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('cost').isFloat({ min: 0 }).withMessage('Costo inválido'),
];

module.exports = { listPackages, getPackage, createPackage, updatePackage, deletePackage, packageValidation };
