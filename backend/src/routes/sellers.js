const express = require('express');
const router = express.Router();
const {
  listSellers, getSeller, createSeller, updateSeller,
  reloadBalance, getTransactions,
  createSellerValidation, reloadBalanceValidation,
} = require('../controllers/sellerController');
const {
  createRequest, listRequests, getPendingCount,
  getMyRequests, getSellerRequests, approveRequest, rejectRequest,
  createRequestValidation,
} = require('../controllers/balanceRequestController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Balance Requests (rutas específicas antes de /:id) ─────────────────
// Vendedor: crear solicitud
router.post('/balance-request', createRequestValidation, createRequest);
// Vendedor: ver mis solicitudes
router.get('/my-balance-requests', getMyRequests);
// Admin: listar todas las solicitudes
router.get('/balance-requests', requireAdmin, listRequests);
// Admin: conteo pendientes
router.get('/balance-requests/count', requireAdmin, getPendingCount);
// Admin: aprobar solicitud
router.post('/balance-requests/:id/approve', requireAdmin, approveRequest);
// Admin: rechazar solicitud
router.post('/balance-requests/:id/reject', requireAdmin, rejectRequest);

// ── Gestión de vendedores ──────────────────────────────────────────────
router.get('/', requireAdmin, listSellers);
router.post('/', requireAdmin, createSellerValidation, auditLog('CREATE_SELLER', 'user'), createSeller);
router.get('/me', getSeller);
router.get('/:id', requireAdmin, getSeller);
router.put('/:id', requireAdmin, auditLog('UPDATE_SELLER', 'user'), updateSeller);
router.post('/:id/reload-balance', requireAdmin, reloadBalanceValidation, auditLog('RELOAD_BALANCE', 'seller_balance'), reloadBalance);
router.get('/:id/transactions', getTransactions);
// Admin: solicitudes de un vendedor específico
router.get('/:id/balance-requests', requireAdmin, getSellerRequests);

module.exports = router;
