const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Voucher = sequelize.define('Voucher', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Código de la ficha (usuario en MikroTik)',
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Contraseña de la ficha',
  },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'sold', 'active', 'used', 'expired', 'disabled'),
    defaultValue: 'available',
    allowNull: false,
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
  seller_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Vendedor asignado cuando se vende',
  },
  batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Lote de generación al que pertenece',
  },
  // Datos de MikroTik
  mikrotik_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '.id del usuario en MikroTik',
  },
  comment: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Comentario en MikroTik',
  },
  // Tiempos
  sold_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Datos de uso
  bytes_in: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  bytes_out: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  uptime: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  // IP del cliente (cuando está activo)
  client_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  client_mac: {
    type: DataTypes.STRING(17),
    allowNull: true,
  },
}, {
  tableName: 'vouchers',
  indexes: [
    { unique: true, fields: ['code'] },
    { fields: ['status'] },
    { fields: ['package_id'] },
    { fields: ['device_id'] },
    { fields: ['seller_id'] },
    { fields: ['batch_id'] },
    { fields: ['mikrotik_id'] },
  ],
});

module.exports = Voucher;
