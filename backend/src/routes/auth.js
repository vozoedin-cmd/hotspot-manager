const express = require('express');
const router = express.Router();
const {
  login, refreshToken, logout, me, changePassword,
  loginValidation, changePasswordValidation,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.post('/login', loginValidation, auditLog('LOGIN', 'user'), login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, auditLog('LOGOUT', 'user'), logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePasswordValidation, auditLog('CHANGE_PASSWORD', 'user'), changePassword);

module.exports = router;
