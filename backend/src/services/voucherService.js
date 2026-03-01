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
  async generateBatch({ deviceId, packageId, quantity = 10, prefix = 'HS', createdBy }) {
    const device = await MikrotikDevice.findByPk(deviceId);
    if (!device) throw new Error('Dispositivo MikroTik no encontrado');

    const pkg = await Package.findByPk(packageId);
    if (!pkg) throw new Error('Paquete no encontrado');

    const batchId = uuidv4();
    const codes = MikrotikService.generateVoucherBatch(quantity, prefix);
    const durationMinutes = pkg.getDurationInMinutes();

    const t = await sequelize.transaction();
    const createdVouchers = [];
    const mikrotikErrors = [];

    try {
      for (const code of codes) {
        const password = MikrotikService.generateVoucherCode('', 6);

        // Crear en MikroTik
        try {
          const result = await mikrotikService.createHotspotUser(device, {
            username: code,
            password: password,
            profile: pkg.mikrotik_profile || 'default',
            comment: `BATCH:${batchId} PKG:${pkg.name}`,
          });

          const mikrotikId = result?.['.id'] || result?.[0]?.ret;

          const voucher = await Voucher.create({
            code,
            password,
            status: 'available',
            package_id: packageId,
            device_id: deviceId,
            batch_id: batchId,
            mikrotik_id: mikrotikId,
            comment: `Lote ${batchId}`,
          }, { transaction: t });

          createdVouchers.push(voucher);
        } catch (mtError) {
          mikrotikErrors.push({ code, error: mtError.message });
          logger.warn(`Error creando ${code} en MikroTik: ${mtError.message}`);

          // Crear igual en BD como disponible (puede sincronizarse después)
          const voucher = await Voucher.create({
            code,
            password,
            status: 'available',
            package_id: packageId,
            device_id: deviceId,
            batch_id: batchId,
            comment: `Lote ${batchId} - Pendiente sync MT`,
          }, { transaction: t });

          createdVouchers.push(voucher);
        }
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
      // Verificar vendedor
      const seller = await User.findByPk(sellerId, {
        include: [{ model: SellerBalance, as: 'balance' }],
        transaction: t,
        lock: true,
      });

      if (!seller || !seller.is_active) {
        throw new Error('Vendedor no encontrado o inactivo');
      }

      // Verificar saldo del vendedor
      const balance = seller.balance;
      const pkg = await Package.findByPk(packageId, { transaction: t });

      if (!pkg) throw new Error('Paquete no encontrado');
      if (!pkg.is_active) throw new Error('Este paquete no está disponible');

      if (!balance || parseFloat(balance.balance) < parseFloat(pkg.cost)) {
        throw new Error(`Saldo insuficiente. Disponible: Q${balance?.balance || 0}, Requerido: Q${pkg.cost}`);
      }

      // Buscar ficha disponible (con lock para evitar doble venta)
      const whereClause = {
        status: 'available',
        package_id: packageId,
      };
      if (deviceId) whereClause.device_id = deviceId;

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
