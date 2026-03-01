const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Middleware de autenticación JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario no autorizado o inactivo' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Middleware para verificar que es administrador
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

/**
 * Middleware para vendedores (seller o admin)
 */
const requireSeller = (req, res, next) => {
  if (!['admin', 'seller'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
};

/**
 * Generar access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Generar refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

module.exports = { authenticate, requireAdmin, requireSeller, generateAccessToken, generateRefreshToken };
