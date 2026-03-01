const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Acción realizada (ej: LOGIN, CREATE_VOUCHER, SELL_VOUCHER)',
  },
  entity: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Entidad afectada (voucher, user, etc)',
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  old_value: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Valor anterior (para cambios)',
  },
  new_value: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Nuevo valor',
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['entity'] },
    { fields: ['created_at'] },
  ],
});

module.exports = AuditLog;
