const logger = require('../config/logger');

/**
 * Manejador de errores global de Express
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email,
  });

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ error: 'Error de validación', details: errors });
  }

  // Error de unicidad de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    return res.status(409).json({ error: `El valor de '${field}' ya existe` });
  }

  // Error de base de datos
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({ error: 'Error de base de datos' });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Error conocido del negocio
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Error genérico
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  return res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
