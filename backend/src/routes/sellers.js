const express = require('express');
const router = express.Router();
const {
  listSellers, getSeller, createSeller, updateSeller,
  reloadBalance, getTransactions,
  createSellerValidation, reloadBalanceValidation,
} = require('../controllers/sellerController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Admin: gestión de vendedores
router.get('/', requireAdmin, listSellers);
router.post('/', requireAdmin, createSellerValidation, auditLog('CREATE_SELLER', 'user'), createSeller);
router.get('/me', getSeller);
router.get('/:id', requireAdmin, getSeller);
router.put('/:id', requireAdmin, auditLog('UPDATE_SELLER', 'user'), updateSeller);
router.post('/:id/reload-balance', requireAdmin, reloadBalanceValidation, auditLog('RELOAD_BALANCE', 'seller_balance'), reloadBalance);
router.get('/:id/transactions', getTransactions);

module.exports = router;
