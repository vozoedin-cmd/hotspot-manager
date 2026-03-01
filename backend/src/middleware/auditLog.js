const { AuditLog } = require('../models');
const logger = require('../config/logger');

/**
 * Middleware para registrar acciones en el log de auditoría
 */
const auditLog = (action, entity = null) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const status = res.statusCode;
      const success = status >= 200 && status < 400;

      // Guardar log de auditoría en background
      setImmediate(async () => {
        try {
          await AuditLog.create({
            user_id: req.user?.id || null,
            action,
            entity,
            entity_id: req.params?.id || body?.id || body?.data?.id || null,
            new_value: success && body ? (typeof body === 'object' ? body : null) : null,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent']?.substring(0, 500),
            status: success ? 'success' : 'failure',
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: status,
            },
          });
        } catch (err) {
          logger.error('Error guardando audit log:', err.message);
        }
      });

      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLog };
