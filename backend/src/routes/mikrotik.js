const express = require('express');
const router = express.Router();
const {
  listDevices, getDevice, createDevice, updateDevice,
  testConnection, syncDevice, getActiveUsers, getProfiles,
  deleteDevice, deviceValidation,
} = require('../controllers/mikrotikController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.use(authenticate);

router.get('/', listDevices);
router.get('/:id', requireAdmin, getDevice);
router.get('/:id/active-users', requireAdmin, getActiveUsers);
router.get('/:id/profiles', requireAdmin, getProfiles);

router.post('/', requireAdmin, deviceValidation, auditLog('CREATE_DEVICE', 'mikrotik_device'), createDevice);
router.put('/:id', requireAdmin, auditLog('UPDATE_DEVICE', 'mikrotik_device'), updateDevice);
router.post('/:id/test', requireAdmin, testConnection);
router.post('/:id/sync', requireAdmin, auditLog('SYNC_DEVICE', 'mikrotik_device'), syncDevice);
router.delete('/:id', requireAdmin, auditLog('DELETE_DEVICE', 'mikrotik_device'), deleteDevice);

module.exports = router;
