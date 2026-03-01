const express = require('express');
const router = express.Router();
const { Voucher, MikrotikDevice } = require('../models');
const logger = require('../config/logger');

/**
 * POST /api/webhook/mikrotik/:device_id
 * MikroTik puede llamar este endpoint cuando un usuario se conecta/desconecta
 * Desde un script en el router usando /tool/fetch
 *
 * Configuración en MikroTik (ejemplo script al login):
 * /tool fetch url="https://tudominio.com/api/webhook/mikrotik/DEVICE_ID" \
 *   http-method=post \
 *   http-data="event=login&username=$username&ip=$address&mac=$mac-address"
 */
router.post('/mikrotik/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { event, username, ip, mac } = req.body;

    logger.info(`Webhook MikroTik: device=${device_id} event=${event} user=${username}`);

    if (!username || !event) {
      return res.status(400).json({ error: 'Parámetros requeridos: event, username' });
    }

    const device = await MikrotikDevice.findByPk(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    const voucher = await Voucher.findOne({
      where: { code: username, device_id },
    });

    if (!voucher) {
      logger.warn(`Webhook: Ficha ${username} no encontrada en BD`);
      return res.json({ status: 'not_tracked' });
    }

    const io = req.app?.get('io');

    if (event === 'login' || event === 'connect') {
      await voucher.update({
        status: 'active',
        activated_at: voucher.activated_at || new Date(),
        client_ip: ip || null,
        client_mac: mac || null,
      });

      if (io) {
        io.emit('voucher_activated', {
          voucher_id: voucher.id,
          code: username,
          device_id,
          ip,
        });
      }

      logger.info(`Ficha activada via webhook: ${username} desde ${ip}`);
    } else if (event === 'logout' || event === 'disconnect' || event === 'expire') {
      await voucher.update({
        status: 'used',
        used_at: new Date(),
        client_ip: null,
        client_mac: null,
      });

      if (io) {
        io.emit('voucher_used', {
          voucher_id: voucher.id,
          code: username,
          device_id,
          event,
        });
      }

      logger.info(`Ficha marcada como usada via webhook: ${username} (${event})`);
    }

    return res.json({ status: 'ok', voucher_id: voucher.id });
  } catch (error) {
    logger.error(`Error en webhook MikroTik: ${error.message}`);
    return res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * GET /api/webhook/mikrotik/:device_id/status
 * Endpoint de estado para probar la conectividad del webhook
 */
router.get('/mikrotik/:device_id/status', async (req, res) => {
  const device = await MikrotikDevice.findByPk(req.params.device_id, {
    attributes: ['id', 'name', 'status'],
  });
  if (!device) return res.status(404).json({ error: 'No encontrado' });
  return res.json({ status: 'ok', device });
});

module.exports = router;
