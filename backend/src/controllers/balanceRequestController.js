const { body, validationResult } = require('express-validator');
const { BalanceRequest, User } = require('../models');
const voucherService = require('../services/voucherService');

/**
 * POST /api/sellers/balance-request - Solicitar recarga de saldo (vendedor)
 */
const createRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, notes } = req.body;
    const sellerId = req.user.id;

    // Verificar que no haya otra solicitud pendiente del mismo vendedor
    const existing = await BalanceRequest.findOne({
      where: { seller_id: sellerId, status: 'pending' },
    });
    if (existing) {
      return res.status(409).json({
        message: 'Ya tienes una solicitud pendiente. Espera a que el administrador la revise.',
      });
    }

    const request = await BalanceRequest.create({
      seller_id: sellerId,
      amount: parseFloat(amount),
      notes: notes || null,
      status: 'pending',
    });

    // Emitir notificación via socket a admins
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('balance_request_created', {
        id: request.id,
        sellerName: req.user.name,
        amount,
      });
    }

    return res.status(201).json({
      message: 'Solicitud enviada. El administrador será notificado.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sellers/balance-requests - Listar solicitudes (admin)
 */
const listRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const where = {};
    if (status) where.status = status;

    const { count, rows } = await BalanceRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'], required: false },
      ],
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

/**
 * GET /api/sellers/my-balance-requests - Ver mis solicitudes (vendedor)
 */
const getMyRequests = async (req, res, next) => {
  try {
    const rows = await BalanceRequest.findAll({
      where: { seller_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });
    return res.json({ data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sellers/balance-requests/count - Conteo de solicitudes pendientes (admin)
 */
const getPendingCount = async (req, res, next) => {
  try {
    const count = await BalanceRequest.count({ where: { status: 'pending' } });
    return res.json({ count });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sellers/:sellerId/balance-requests - Solicitudes de un vendedor específico (admin)
 */
const getSellerRequests = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const rows = await BalanceRequest.findAll({
      where: { seller_id: sellerId },
      order: [['created_at', 'DESC']],
      limit: 10,
    });
    return res.json({ data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sellers/balance-requests/:id/approve - Aprobar solicitud (admin)
 */
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;

    const request = await BalanceRequest.findByPk(id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name'] }],
    });
    if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'La solicitud ya fue procesada' });
    }

    // Recargar saldo
    const result = await voucherService.reloadSellerBalance({
      sellerId: request.seller_id,
      amount: parseFloat(request.amount),
      adminId: req.user.id,
      description: `Aprobación solicitud #${id}${review_notes ? ' - ' + review_notes : ''}`,
    });

    // Actualizar solicitud
    await request.update({
      status: 'approved',
      reviewed_by: req.user.id,
      review_notes: review_notes || null,
    });

    // Notificar al vendedor via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`seller_${request.seller_id}`).emit('balance_updated', {
        balance: result.balance_after,
        message: `Solicitud aprobada: +Q${request.amount}`,
      });
      io.to(`seller_${request.seller_id}`).emit('balance_request_updated', {
        id: request.id,
        status: 'approved',
        amount: request.amount,
      });
    }

    return res.json({ message: `Saldo aprobado: Q${request.amount}`, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sellers/balance-requests/:id/reject - Rechazar solicitud (admin)
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;

    const request = await BalanceRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'La solicitud ya fue procesada' });
    }

    await request.update({
      status: 'rejected',
      reviewed_by: req.user.id,
      review_notes: review_notes || null,
    });

    // Notificar al vendedor via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`seller_${request.seller_id}`).emit('balance_request_updated', {
        id: request.id,
        status: 'rejected',
        amount: request.amount,
      });
    }

    return res.json({ message: 'Solicitud rechazada', data: request });
  } catch (error) {
    next(error);
  }
};

// Validaciones
const createRequestValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Monto mínimo Q1.00'),
];

module.exports = {
  createRequest,
  listRequests,
  getPendingCount,
  getMyRequests,
  getSellerRequests,
  approveRequest,
  rejectRequest,
  createRequestValidation,
};
