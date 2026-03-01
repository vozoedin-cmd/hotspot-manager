const express = require('express');
const router = express.Router();
const { User, SellerBalance, AuditLog } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/users - Listar todos los usuarios (admin)
 */
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [{ model: SellerBalance, as: 'balance' }],
      order: [['role', 'ASC'], ['name', 'ASC']],
    });
    return res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id/audit-logs
 */
router.get('/:id/audit-logs', requireAdmin, async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return res.json({ data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/toggle-active - Activar/desactivar usuario
 */
router.patch('/:id/toggle-active', requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });

    await user.update({ is_active: !user.is_active });
    return res.json({
      message: `Usuario ${user.is_active ? 'activado' : 'desactivado'}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
