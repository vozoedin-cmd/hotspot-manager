/**
 * Servicio de backup automático de PostgreSQL
 *
 * Ejecuta pg_dump diariamente a las 02:00 AM y limpia backups viejos.
 * Los archivos se guardan en /app/backups (montado como ./backend/backups en el host).
 *
 * Requiere postgresql-client instalado en la imagen Docker.
 */
const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');

class BackupService {
  constructor() {
    this.cronJob = null;
  }

  /** Asegura que el directorio de backups exista */
  _ensureDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Crea un backup comprimido con pg_dump.
   * Retorna Promise<string> con la ruta del archivo creado.
   */
  runBackup() {
    return new Promise((resolve, reject) => {
      this._ensureDir();

      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const fileName = `backup-${date}.sql.gz`;
      const filePath = path.join(BACKUP_DIR, fileName);

      const env = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      };

      // pg_dump | gzip > file
      const dump = spawn('pg_dump', [
        '-h', process.env.DB_HOST || 'db',
        '-p', String(process.env.DB_PORT || 5432),
        '-U', process.env.DB_USER,
        '-d', process.env.DB_NAME,
        '--no-password',
        '--clean',
        '--if-exists',
      ], { env });

      const gzip = spawn('gzip', ['-c']);
      const out  = fs.createWriteStream(filePath);

      dump.stdout.pipe(gzip.stdin);
      gzip.stdout.pipe(out);

      let errorOutput = '';
      dump.stderr.on('data', (d) => { errorOutput += d.toString(); });
      gzip.stderr.on('data', (d) => { errorOutput += d.toString(); });

      dump.on('error', (err) => reject(new Error(`pg_dump error: ${err.message}`)));
      gzip.on('error', (err) => reject(new Error(`gzip error: ${err.message}`)));

      out.on('finish', () => {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        if (stats.size === 0) {
          fs.unlinkSync(filePath);
          return reject(new Error(`Backup vacío — pg_dump stderr: ${errorOutput}`));
        }
        logger.info(`✅ Backup creado: ${fileName} (${sizeMB} MB)`);
        resolve(filePath);
      });

      out.on('error', (err) => {
        reject(new Error(`Error escribiendo backup: ${err.message}`));
      });
    });
  }

  /**
   * Elimina backups más antiguos que BACKUP_KEEP_DAYS días.
   */
  cleanOldBackups() {
    const keepDays = parseInt(process.env.BACKUP_KEEP_DAYS) || 7;
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

    let removed = 0;
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      for (const file of files) {
        if (!file.startsWith('backup-') || !file.endsWith('.sql.gz')) continue;
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          removed++;
          logger.info(`🗑️  Backup eliminado (>%d días): %s`, keepDays, file);
        }
      }
    } catch (err) {
      logger.warn('Error limpiando backups viejos:', err.message);
    }
    return removed;
  }

  /**
   * Listar backups disponibles con tamaño y fecha.
   */
  listBackups() {
    try {
      this._ensureDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
        .map(f => {
          const filePath = path.join(BACKUP_DIR, f);
          const stat = fs.statSync(filePath);
          return {
            name: f,
            size: stat.size,
            created_at: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return files;
    } catch {
      return [];
    }
  }

  /**
   * Inicia el scheduler: backup diario a las 02:00 AM.
   */
  start() {
    this._ensureDir();

    // Ejecutar diariamente a las 02:00 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      logger.info('⏰ Iniciando backup automático diario...');
      try {
        await this.runBackup();
        this.cleanOldBackups();
      } catch (err) {
        logger.error('❌ Error en backup automático:', err.message);
      }
    }, { timezone: 'America/Guatemala' });

    logger.info('📦 Backup service iniciado (cron diario 02:00 AM Guatemala)');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }
}

module.exports = new BackupService();
