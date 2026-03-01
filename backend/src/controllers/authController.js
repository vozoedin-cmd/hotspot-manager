const { body, validationResult } = require('express-validator');
const { User, SellerBalance } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

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

module.exports = { login, refreshToken, logout, me, changePassword, loginValidation, changePasswordValidation };
