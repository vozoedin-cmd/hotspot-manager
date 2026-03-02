const User = require('./User');
const MikrotikDevice = require('./MikrotikDevice');
const Package = require('./Package');
const Voucher = require('./Voucher');
const Sale = require('./Sale');
const SellerBalance = require('./SellerBalance');
const Transaction = require('./Transaction');
const AuditLog = require('./AuditLog');
const BalanceRequest = require('./BalanceRequest');

// ==========================
// ASOCIACIONES
// ==========================

// Usuario <-> Saldo
User.hasOne(SellerBalance, { foreignKey: 'seller_id', as: 'balance' });
SellerBalance.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Usuario <-> Transacciones
User.hasMany(Transaction, { foreignKey: 'seller_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Usuario <-> Vouchers (vendidos)
User.hasMany(Voucher, { foreignKey: 'seller_id', as: 'sold_vouchers' });
Voucher.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Usuario <-> Ventas
User.hasMany(Sale, { foreignKey: 'seller_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Usuario <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Usuario <-> BalanceRequests
User.hasMany(BalanceRequest, { foreignKey: 'seller_id', as: 'balance_requests' });
BalanceRequest.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
BalanceRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// Paquete <-> Vouchers
Package.hasMany(Voucher, { foreignKey: 'package_id', as: 'vouchers' });
Voucher.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// Paquete <-> Ventas
Package.hasMany(Sale, { foreignKey: 'package_id', as: 'sales' });
Sale.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// Dispositivo MikroTik <-> Vouchers
MikrotikDevice.hasMany(Voucher, { foreignKey: 'device_id', as: 'vouchers' });
Voucher.belongsTo(MikrotikDevice, { foreignKey: 'device_id', as: 'device' });

// Dispositivo MikroTik <-> Ventas
MikrotikDevice.hasMany(Sale, { foreignKey: 'device_id', as: 'sales' });
Sale.belongsTo(MikrotikDevice, { foreignKey: 'device_id', as: 'device' });

// Voucher <-> Venta
Voucher.hasOne(Sale, { foreignKey: 'voucher_id', as: 'sale' });
Sale.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' });

module.exports = {
  User,
  MikrotikDevice,
  Package,
  Voucher,
  Sale,
  SellerBalance,
  Transaction,
  AuditLog,
  BalanceRequest,
};
