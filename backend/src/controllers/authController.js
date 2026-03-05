const { body, validationResult } = require('express-validator');
const { User, SellerBalance } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, totp_code } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: SellerBalance, as: 'balance' }],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    // Si tiene 2FA habilitado, solicitar el código TOTP
    if (user.two_fa_enabled) {
      if (!totp_code) {
        return res.status(200).json({ requires_2fa: true, message: 'Código 2FA requerido' });
      }
      const isValid = authenticator.verify({ token: totp_code, secret: user.two_fa_secret });
      if (!isValid) {
        return res.status(401).json({ error: 'Código 2FA incorrecto' });
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Guardar refresh token
    await user.update({
      last_login: new Date(),
      refresh_token: refreshToken,
    });

    logger.info(`Login exitoso: ${user.email} [${user.role}]`);

    return res.json({
      message: 'Inicio de sesión exitoso',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: process.env.JWT_EXPIRES_IN || '24h',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        balance: user.balance,
        device_id: user.device_id ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refresh_token || !user.is_active) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await user.update({ refresh_token: newRefreshToken });

    return res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await req.user.update({ refresh_token: null });
    logger.info(`Logout: ${req.user.email}`);
    return res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{ model: SellerBalance, as: 'balance' }],
  });
  return res.json({ user });
};

/**
 * POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { current_password, new_password } = req.body;

    if (!(await req.user.comparePassword(current_password))) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    await req.user.update({ password: new_password });

    logger.info(`Contraseña cambiada: ${req.user.email}`);
    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

// Validaciones
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Contraseña actual requerida'),
  body('new_password').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
];

/**
 * POST /api/auth/2fa/setup - Generar secreto TOTP y QR para el admin
 */
const setup2FA = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });

    const secret = authenticator.generateSecret();
    const appName = 'HotspotManager';
    const otpauth = authenticator.keyuri(req.user.email, appName, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Guardar secreto temporal (no activado hasta verificar)
    await req.user.update({ two_fa_secret: secret });

    return res.json({
      secret,
      qr_code: qrDataUrl,
      message: 'Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc)',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/2fa/verify - Verificar código y activar 2FA
 */
const verify2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código requerido' });
    if (!req.user.two_fa_secret) return res.status(400).json({ error: 'Primero genera el secreto 2FA' });

    const isValid = authenticator.verify({ token: code, secret: req.user.two_fa_secret });
    if (!isValid) return res.status(400).json({ error: 'Código incorrecto. Verifica que la hora de tu dispositivo sea correcta.' });

    await req.user.update({ two_fa_enabled: true });
    logger.info(`2FA activado para ${req.user.email}`);

    return res.json({ message: '2FA activado correctamente', two_fa_enabled: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/2fa/disable - Desactivar 2FA (requiere contraseña)
 */
const disable2FA = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Contraseña requerida para desactivar 2FA' });

    const validPassword = await req.user.comparePassword(password);
    if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

    await req.user.update({ two_fa_enabled: false, two_fa_secret: null });
    logger.info(`2FA desactivado para ${req.user.email}`);

    return res.json({ message: '2FA desactivado', two_fa_enabled: false });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/2fa/status - Obtener estado del 2FA
 */
const status2FA = async (req, res) => {
  return res.json({
    two_fa_enabled: req.user.two_fa_enabled ?? false,
    role: req.user.role,
  });
};

module.exports = {
  login, refreshToken, logout, me, changePassword,
  setup2FA, verify2FA, disable2FA, status2FA,
  loginValidation, changePasswordValidation,
};
