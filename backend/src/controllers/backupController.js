const backupService = require('../services/backupService');

/**
 * GET /api/reports/backups
 * Lista backups disponibles
 */
const listBackups = (req, res) => {
  const backups = backupService.listBackups();
  return res.json({ data: backups, total: backups.length });
};

/**
 * POST /api/reports/backups/run
 * Dispara un backup manual (async — no bloquea)
 */
const runManualBackup = async (req, res, next) => {
  try {
    // Iniciar en background, responder de inmediato
    res.json({ message: 'Backup iniciado en segundo plano. Consulta /backups en unos segundos.' });
    await backupService.runBackup();
    backupService.cleanOldBackups();
  } catch (err) {
    // Ya respondimos, solo loguear
    const logger = require('../config/logger');
    logger.error('Error en backup manual:', err.message);
  }
};

module.exports = { listBackups, runManualBackup };
