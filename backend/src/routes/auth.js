const express = require('express');
const router = express.Router();
const {
  login, refreshToken, logout, me, changePassword,
  setup2FA, verify2FA, disable2FA, status2FA,
  loginValidation, changePasswordValidation,
} = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.post('/login', loginValidation, auditLog('LOGIN', 'user'), login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, auditLog('LOGOUT', 'user'), logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePasswordValidation, auditLog('CHANGE_PASSWORD', 'user'), changePassword);

// ── 2FA ─────────────────────────────────────────────────────────────
router.get('/2fa/status', authenticate, status2FA);
router.post('/2fa/setup', authenticate, requireAdmin, setup2FA);
router.post('/2fa/verify', authenticate, requireAdmin, verify2FA);
router.post('/2fa/disable', authenticate, requireAdmin, auditLog('DISABLE_2FA', 'user'), disable2FA);

module.exports = router;
