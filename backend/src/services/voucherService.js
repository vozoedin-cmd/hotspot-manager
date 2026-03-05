/**
 * Servicio de Fichas (Vouchers)
 * Gestiona la creación, asignación, venta y sincronización de fichas
 */
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const { Voucher, Sale, SellerBalance, Transaction, Package, MikrotikDevice, User } = require('../models');
const mikrotikService = require('./mikrotikService');
const { MikrotikService } = require('./mikrotikService');
const logger = require('../config/logger');

class VoucherService {
  /**
   * Generar un lote de fichas y crearlas en MikroTik + BD
   */
  async generateBatch({ deviceId, packageId, quantity = 10, prefix = '', voucherType = 'user_password', codeLength = 6, pwdLength = 6, numbersOnly = false, createdBy }) {
    const device = await MikrotikDevice.findByPk(deviceId);
    if (!device) throw new Error('Dispositivo MikroTik no encontrado');

    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new Error('Paquete no encontrado');

    const batchId = uuidv4();
    const codes = MikrotikService.generateVoucherBatch(quantity, prefix, codeLength, numbersOnly);
    const durationMinutes = pkg.getDurationInMinutes();

    // Calcular limit-uptime en formato MikroTik (HH:MM:SS o XdHH:MM:SS)
    const totalSeconds = durationMinutes * 60;
    const days = Math.floor(totalSeconds / 86400);
    const remainSeconds = totalSeconds % 86400;
    const hh = String(Math.floor(remainSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((remainSeconds % 3600) / 60)).padStart(2, '0');
    const ss = '00';
    const limitUptime = days > 0 ? `${days}d${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
    const hotspotServer = device.hotspot_server || 'hotspot1';

    const t = await sequelize.transaction();
    const createdVouchers = [];
    const mikrotikErrors = [];

    try {
      for (const code of codes) {
        // Generar contraseña según tipo
        const password = voucherType === 'pin'
          ? ''   // PIN: solo código, contraseña vacía
          : MikrotikService.generateVoucherCode('', pwdLength, numbersOnly);

        // Crear en MikroTik
        let mikrotikId = null;
        let mikrotikOk = false;
        const profileToUse = pkg.mikrotik_profile || 'default';

        try {
          // Primer intento con el perfil configurado
          const result = await mikrotikService.createHotspotUser(device, {
            username: code,
            password: password,
            profile: profileToUse,
            server: hotspotServer,
            limitUptime,
            comment: `BATCH:${batchId} PKG:${pkg.name}`,
          });
          mikrotikId = result?.['.id'] || result?.[0]?.ret;
          mikrotikOk = true;
        } catch (mtError) {
          // Si el error es de perfil no encontrado, reintentar con "default"
          const isProfileError = mtError.message && (
            mtError.message.includes('input does not match any value of profile') ||
            mtError.message.includes('no such item') ||
            mtError.message.toLowerCase().includes('profile')
          );

          if (isProfileError && profileToUse !== 'default') {
            logger.warn(`Perfil "${profileToUse}" no existe en MikroTik para ${code}, reintentando con "default"`);
            try {
              const result2 = await mikrotikService.createHotspotUser(device, {
                username: code,
                password: password,
                profile: 'default',
                server: hotspotServer,
                limitUptime,
                comment: `BATCH:${batchId} PKG:${pkg.name} (perfil:default)`,
              });
              mikrotikId = result2?.['.id'] || result2?.[0]?.ret;
              mikrotikOk = true;
              logger.info(`${code} creado en MikroTik con perfil "default" (original: ${profileToUse})`);
            } catch (mtError2) {
              mikrotikErrors.push({ code, error: mtError2.message });
              logger.error(`Error creando ${code} en MikroTik (perfil default): ${mtError2.message}`);
            }
          } else {
            mikrotikErrors.push({ code, error: mtError.message });
            logger.error(`Error creando ${code} en MikroTik: ${mtError.message}`);
          }
        }

        const voucher = await Voucher.create({
          code,
          password,
          voucher_type: voucherType,
          status: 'available',
          package_id: packageId,
          device_id: deviceId,
          batch_id: batchId,
          mikrotik_id: mikrotikOk ? mikrotikId : null,
          comment: mikrotikOk
            ? `Lote ${batchId}`
            : `Lote ${batchId} - Pendiente sync MT`,
        }, { transaction: t });

        createdVouchers.push(voucher);
      }

      await t.commit();

      logger.info(`Lote generado: ${batchId} | ${createdVouchers.length} fichas | ${mikrotikErrors.length} errores MT`);

      return {
        batchId,
        total: quantity,
        created: createdVouchers.length,
        mikrotikErrors,
        vouchers: createdVouchers,
      };
    } catch (error) {
      await t.rollback();
      logger.error(`Error generando lote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Vender una ficha a un vendedor
   * Protección contra doble venta mediante transacción bloqueante
   */
  async sellVoucher({ packageId, deviceId, sellerId, clientName = null }) {
    const t = await sequelize.transaction({
      isolationLevel: sequelize.Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // Verificar vendedor (sin include para evitar FOR UPDATE en outer join)
      const seller = await User.findByPk(sellerId, { transaction: t });

      if (!seller || !seller.is_active) {
        throw new Error('Vendedor no encontrado o inactivo');
      }

      // Verificar saldo del vendedor (lock separado en SellerBalance)
      const balance = await SellerBalance.findOne({
        where: { seller_id: sellerId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const pkg = await Package.findByPk(packageId, { transaction: t });

      if (!pkg) throw new Error('Paquete no encontrado');
      if (!pkg.is_active) throw new Error('Este paquete no está disponible');

      if (!balance || parseFloat(balance.balance) < parseFloat(pkg.cost)) {
        throw new Error(`Saldo insuficiente. Disponible: Q${balance?.balance || 0}, Requerido: Q${pkg.cost}`);
      }

      // Buscar ficha disponible (con lock para evitar doble venta)
      // Si el vendedor tiene un dispositivo asignado, forzar ese dispositivo
      const whereClause = {
        status: 'available',
        package_id: packageId,
      };
      const effectiveDeviceId = seller.device_id || deviceId;
      if (effectiveDeviceId) whereClause.device_id = effectiveDeviceId;

      const voucher = await Voucher.findOne({
        where: whereClause,
        order: [['created_at', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!voucher) {
        throw new Error('No hay fichas disponibles para este paquete');
      }

      const now = new Date();
      const balanceBefore = parseFloat(balance.balance);
      const newBalance = balanceBefore - parseFloat(pkg.cost);

      // Marcar ficha como vendida
      await voucher.update({
        status: 'sold',
        seller_id: sellerId,
        sold_at: now,
      }, { transaction: t });

      // Descontar saldo del vendedor
      await balance.update({
        balance: newBalance,
        total_spent: parseFloat(balance.total_spent) + parseFloat(pkg.cost),
      }, { transaction: t });

      // Crear registro de venta
      const profit = parseFloat(pkg.price) - parseFloat(pkg.cost);
      const sale = await Sale.create({
        voucher_id: voucher.id,
        seller_id: sellerId,
        package_id: packageId,
        device_id: voucher.device_id,
        amount: pkg.price,
        cost: pkg.cost,
        profit,
        client_name: clientName,
      }, { transaction: t });

      // Crear transacción de saldo
      await Transaction.create({
        seller_id: sellerId,
        type: 'debit',
        amount: pkg.cost,
        balance_before: balanceBefore,
        balance_after: newBalance,
        reference_id: sale.id,
        reference_type: 'sale',
        description: `Venta ficha ${voucher.code} - ${pkg.name}`,
      }, { transaction: t });

      await t.commit();

      // Sincronizar con MikroTik en background (no bloquea la respuesta)
      this.syncVoucherSaleToMikrotik(voucher, seller).catch((e) => {
        logger.error(`Error sincronizando venta a MikroTik: ${e.message}`);
      });

      logger.info(`Ficha vendida: ${voucher.code} | Vendedor: ${seller.email} | Saldo: Q${balanceBefore} -> Q${newBalance}`);

      return {
        voucher: await Voucher.findByPk(voucher.id, {
          include: [{ model: Package, as: 'package' }],
        }),
        sale,
        balance_remaining: newBalance,
      };
    } catch (error) {
      await t.rollback();
      logger.error(`Error en venta de ficha: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar estado de venta con MikroTik (agregar comentario)
   */
  async syncVoucherSaleToMikrotik(voucher, seller) {
    try {
      const device = await MikrotikDevice.findByPk(voucher.device_id);
      if (!device || !voucher.mikrotik_id) return;

      const conn = await mikrotikService.connect(device);
      await conn.write([
        '/ip/hotspot/user/set',
        `=.id=${voucher.mikrotik_id}`,
        `=comment=SOLD:${new Date().toISOString()} SELLER:${seller.name}`,
      ]);
    } catch (error) {
      logger.warn(`No se pudo actualizar comentario en MikroTik: ${error.message}`);
    }
  }

  /**
   * Obtener fichas disponibles por paquete
   */
  async getAvailableVouchers(packageId, deviceId = null) {
    const where = { status: 'available', package_id: packageId };
    if (deviceId) where.device_id = deviceId;

    const count = await Voucher.count({ where });
    return { available: count, package_id: packageId };
  }

  /**
   * Recargar saldo de un vendedor (acción de admin)
   */
  async reloadSellerBalance({ sellerId, amount, adminId, description = '' }) {
    const t = await sequelize.transaction();

    try {
      const balance = await SellerBalance.findOne({
        where: { seller_id: sellerId },
        transaction: t,
        lock: true,
      });

      if (!balance) throw new Error('Vendedor no encontrado');

      const balanceBefore = parseFloat(balance.balance);
      const newBalance = balanceBefore + parseFloat(amount);

      await balance.update({
        balance: newBalance,
        total_earned: parseFloat(balance.total_earned) + parseFloat(amount),
        last_reload: new Date(),
      }, { transaction: t });

      await Transaction.create({
        seller_id: sellerId,
        type: 'credit',
        amount,
        balance_before: balanceBefore,
        balance_after: newBalance,
        reference_type: 'reload',
        description: description || `Recarga de saldo por admin`,
        created_by: adminId,
      }, { transaction: t });

      await t.commit();

      logger.info(`Saldo recargado: Vendedor ${sellerId} | +Q${amount} | Total: Q${newBalance}`);

      return { balance_before: balanceBefore, balance_after: newBalance, amount };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new VoucherService();
