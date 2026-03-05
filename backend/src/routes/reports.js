const express = require('express');
const router = express.Router();
const {
  getDashboard, getSalesReport, getSalesBySeller,
  getSalesByPackage, getSalesByDay, getSellerDashboard,
} = require('../controllers/reportController');
const { listBackups, runManualBackup } = require('../controllers/backupController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// Admin
router.get('/dashboard', requireAdmin, getDashboard);
router.get('/sales', requireAdmin, getSalesReport);
router.get('/sales-by-seller', requireAdmin, getSalesBySeller);
router.get('/sales-by-package', requireAdmin, getSalesByPackage);
router.get('/sales-by-day', requireAdmin, getSalesByDay);

// Vendedor
router.get('/seller-dashboard', getSellerDashboard);

// Backups (admin)
router.get('/backups', requireAdmin, listBackups);
router.post('/backups/run', requireAdmin, runManualBackup);

module.exports = router;
