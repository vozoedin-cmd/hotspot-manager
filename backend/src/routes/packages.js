const express = require('express');
const router = express.Router();
const {
  listPackages, getPackage, createPackage, updatePackage,
  deletePackage, packageValidation,
} = require('../controllers/packageController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/', listPackages);
router.get('/:id', getPackage);
router.post('/', requireAdmin, packageValidation, auditLog('CREATE_PACKAGE', 'package'), createPackage);
router.put('/:id', requireAdmin, auditLog('UPDATE_PACKAGE', 'package'), updatePackage);
router.delete('/:id', requireAdmin, auditLog('DELETE_PACKAGE', 'package'), deletePackage);

module.exports = router;
