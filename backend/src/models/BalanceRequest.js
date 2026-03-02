const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BalanceRequest = sequelize.define(
  'BalanceRequest',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    seller_id: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
    review_notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'balance_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = BalanceRequest;
