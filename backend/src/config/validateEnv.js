/**
 * Validación de variables de entorno al arrancar.
 * - Las vars REQUIRED harán que el proceso termine si faltan.
 * - Las vars WARNED emitirán un error de log si contienen valores inseguros por defecto.
 */
const logger = require('./logger');

const REQUIRED = [
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'NODE_ENV',
];

/** Valores que jamás deben llegar a producción */
const INSECURE_DEFAULTS = {
  JWT_SECRET: ['changeme', 'secret', 'your-secret'],
  JWT_REFRESH_SECRET: ['changeme', 'secret', 'your-refresh-secret'],
  DB_PASS: ['password', 'postgres', 'secret', 'changeme'],
  ADMIN_PASSWORD: ['Admin@12345!', 'admin', 'password'],
};

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`⛔ Variables de entorno requeridas no definidas: ${missing.join(', ')}`);
    logger.error('   Revisa backend/.env y reinicia el servidor.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const [key, bad] of Object.entries(INSECURE_DEFAULTS)) {
      const val = process.env[key];
      if (val && bad.some((b) => val.toLowerCase().includes(b.toLowerCase()))) {
        logger.warn(`⚠️  [ENV] ${key} contiene un valor inseguro por defecto en producción. Cámbialo.`);
      }
    }

    if (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS === '*') {
      logger.warn('⚠️  [ENV] CORS_ORIGINS es wildcard (*) en producción. Especifica el dominio permitido.');
    }

    const jwtLen = (process.env.JWT_SECRET || '').length;
    if (jwtLen < 32) {
      logger.warn(`⚠️  [ENV] JWT_SECRET es demasiado corto (${jwtLen} chars). Usa al menos 32 caracteres aleatorios.`);
    }
  }

  logger.info(`✅ Variables de entorno validadas — NODE_ENV=${process.env.NODE_ENV}`);
}

module.exports = validateEnv;
