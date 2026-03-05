const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { Sale, Voucher, User, Package, MikrotikDevice, Transaction, SellerBalance } = require('../models');

/**
 * GET /api/reports/dashboard - Resumen general (admin)
 */
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalVouchers,
      availableVouchers,
      soldVouchers,
      activeVouchers,
      usedVouchers,
      salesToday,
      salesMonth,
      totalSellers,
      activeSellers,
      devices,
    ] = await Promise.all([
      Voucher.count(),
      Voucher.count({ where: { status: 'available' } }),
      Voucher.count({ where: { status: 'sold' } }),
      Voucher.count({ where: { status: 'active' } }),
      Voucher.count({ where: { status: 'used' } }),
      Sale.sum('amount', { where: { created_at: { [Op.gte]: today } } }),
      Sale.sum('amount', { where: { created_at: { [Op.gte]: monthStart } } }),
      User.count({ where: { role: 'seller' } }),
      User.count({ where: { role: 'seller', is_active: true } }),
      MikrotikDevice.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'status', 'last_sync'],
      }),
    ]);

    return res.json({
      data: {
        vouchers: {
          total: totalVouchers,
          available: availableVouchers,
          sold: soldVouchers,
          active: activeVouchers,
          used: usedVouchers,
        },
        revenue: {
          today: parseFloat(salesToday) || 0,
          this_month: parseFloat(salesMonth) || 0,
        },
        sellers: {
          total: totalSellers,
          active: activeSellers,
        },
        devices,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales - Reporte de ventas
 */
const getSalesReport = async (req, res, next) => {
  try {
    const { from, to, seller_id, package_id, device_id, page = 1, limit = 50 } = req.query;

    const where = {};
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, [Op.lte]: toDate };
    }
    if (seller_id) where.seller_id = seller_id;
    if (package_id) where.package_id = package_id;
    if (device_id) where.device_id = device_id;

    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Package, as: 'package', attributes: ['id', 'name', 'duration_value', 'duration_unit'] },
        { model: MikrotikDevice, as: 'device', attributes: ['id', 'name', 'zone'] },
        { model: Voucher, as: 'voucher', attributes: ['id', 'code'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 200),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Totales
    const totals = await Sale.findOne({
      where,
      attributes: [
        [fn('SUM', col('amount')), 'total_amount'],
        [fn('SUM', col('cost')), 'total_cost'],
        [fn('SUM', col('profit')), 'total_profit'],
        [fn('COUNT', col('id')), 'total_sales'],
      ],
      raw: true,
    });

    return res.json({
      data: rows,
      totals: {
        amount: parseFloat(totals.total_amount) || 0,
        cost: parseFloat(totals.total_cost) || 0,
        profit: parseFloat(totals.total_profit) || 0,
        count: parseInt(totals.total_sales) || 0,
      },
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales-by-seller - Ventas agrupadas por vendedor
 */
const getSalesBySeller = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from) where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, [Op.lte]: toDate };
    }

    const report = await Sale.findAll({
      where,
      attributes: [
        'seller_id',
        [fn('COUNT', col('Sale.id')), 'total_sales'],
        [fn('SUM', col('amount')), 'total_amount'],
        [fn('SUM', col('cost')), 'total_cost'],
        [fn('SUM', col('profit')), 'total_profit'],
      ],
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      ],
      group: ['seller_id', 'seller.id'],
      order: [[literal('total_amount'), 'DESC']],
      raw: false,
    });

    return res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales-by-package - Ventas agrupadas por paquete
 */
const getSalesByPackage = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from) where.created_at = { [Op.gte]: new Date(from) };
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at = { ...(where.created_at || {}), [Op.lte]: toDate };
    }

    const report = await Sale.findAll({
      where,
      attributes: [
        'package_id',
        [fn('COUNT', col('Sale.id')), 'total_sales'],
        [fn('SUM', col('amount')), 'total_amount'],
      ],
      include: [
        { model: Package, as: 'package', attributes: ['id', 'name', 'price'] },
      ],
      group: ['package_id', 'package.id'],
      order: [[literal('total_sales'), 'DESC']],
    });

    return res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sales-by-day - Ventas agrupadas por día (últimos N días)
 */
const getSalesByDay = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const rows = await Sale.findAll({
      where: { created_at: { [Op.gte]: since } },
      attributes: [
        [fn('DATE', col('created_at')), 'day'],
        [fn('COUNT', col('id')), 'sales'],
        [fn('SUM', col('amount')), 'revenue'],
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    // Fill missing days with 0
    const map = {};
    rows.forEach(r => { map[r.day] = r; });
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        day: key,
        sales: map[key] ? parseInt(map[key].sales) : 0,
        revenue: map[key] ? parseFloat(map[key].revenue) : 0,
      });
    }

    return res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/seller-dashboard - Panel del vendedor
 */
const getSellerDashboard = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [sellerBalance, salesToday, salesMonth, recentSales, recentTransactions] = await Promise.all([
      SellerBalance.findOne({ where: { seller_id: sellerId } }),
      Sale.count({ where: { seller_id: sellerId, created_at: { [Op.gte]: today } } }),
      Sale.count({
        where: {
          seller_id: sellerId,
          created_at: { [Op.gte]: monthStart },
        },
      }),
      Sale.findAll({
        where: { seller_id: sellerId },
        include: [
          { model: Package, as: 'package', attributes: ['name'] },
          { model: Voucher, as: 'voucher', attributes: ['code'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
      Transaction.findAll({
        where: { seller_id: sellerId },
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
    ]);

    return res.json({
      balance: parseFloat(sellerBalance?.balance) || 0,
      monthlyLimit: parseFloat(sellerBalance?.monthly_limit) || 2000,
      totalEarned: parseFloat(sellerBalance?.total_earned) || 0,
      totalSpent: parseFloat(sellerBalance?.total_spent) || 0,
      todaySales: salesToday,
      monthSales: salesMonth,
      recentSales,
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getSalesReport,
  getSalesBySeller,
  getSalesByPackage,
  getSalesByDay,
  getSellerDashboard,
};
