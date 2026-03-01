const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SellerBalance = sequelize.define('SellerBalance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: 'Saldo actual disponible',
  },
  monthly_limit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 2000.00,
    allowNull: false,
    comment: 'Límite mensual asignado por admin (Q2000 por defecto)',
  },
  total_earned: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total ganado históricamente',
  },
  total_spent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total gastado históricamente',
  },
  last_reload: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última recarga de saldo',
  },
}, {
  tableName: 'seller_balances',
  indexes: [
    { fields: ['seller_id'] },
  ],
});

module.exports = SellerBalance;
