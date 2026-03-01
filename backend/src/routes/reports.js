const express = require('express');
const router = express.Router();
const {
  getDashboard, getSalesReport, getSalesBySeller,
  getSalesByPackage, getSellerDashboard,
} = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// Admin
router.get('/dashboard', requireAdmin, getDashboard);
router.get('/sales', requireAdmin, getSalesReport);
router.get('/sales-by-seller', requireAdmin, getSalesBySeller);
router.get('/sales-by-package', requireAdmin, getSalesByPackage);

// Vendedor
router.get('/seller-dashboard', getSellerDashboard);

module.exports = router;
