const express = require('express');
const router = express.Router();
const {
  listVouchers, getVoucher, generateVouchers, sellVoucher,
  getAvailableCount, disableVoucher, generateValidation, sellValidation,
} = require('../controllers/voucherController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/', listVouchers);
router.get('/available-count', getAvailableCount);
router.get('/:id', getVoucher);

// Admin
router.post('/generate', requireAdmin, generateValidation, auditLog('GENERATE_VOUCHERS', 'voucher'), generateVouchers);
router.patch('/:id/disable', requireAdmin, auditLog('DISABLE_VOUCHER', 'voucher'), disableVoucher);

// Vendedor
router.post('/sell', sellValidation, auditLog('SELL_VOUCHER', 'voucher'), sellVoucher);

module.exports = router;
