const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  voucher_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'vouchers', key: 'id' },
  },
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  package_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'packages', key: 'id' },
  },
  device_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mikrotik_devices', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Monto de la venta',
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Costo descontado del saldo del vendedor',
  },
  profit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Ganancia = amount - cost',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  client_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'sales',
  indexes: [
    { fields: ['seller_id'] },
    { fields: ['voucher_id'] },
    { fields: ['package_id'] },
    { fields: ['device_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Sale;
