const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  type: {
    type: DataTypes.ENUM('credit', 'debit', 'adjustment', 'monthly_reload'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  balance_before: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  balance_after: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID de la venta u operación relacionada',
  },
  reference_type: {
    type: DataTypes.ENUM('sale', 'reload', 'adjustment', 'refund'),
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Admin que realizó la transacción (para ajustes)',
  },
}, {
  tableName: 'transactions',
  updatedAt: false,
  indexes: [
    { fields: ['seller_id'] },
    { fields: ['type'] },
    { fields: ['created_at'] },
    { fields: ['reference_id'] },
  ],
});

module.exports = Transaction;
