const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MikrotikDevice = sequelize.define('MikrotikDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre descriptivo del router (ej: Sector Norte)',
  },
  host: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'IP o hostname del MikroTik',
  },
  port: {
    type: DataTypes.INTEGER,
    defaultValue: 8728,
    comment: '8728 (API), 8729 (API-SSL)',
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  use_ssl: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  hotspot_server: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre del servidor Hotspot en MikroTik',
  },
  zone: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Zona geográfica del dispositivo',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_sync: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'error'),
    defaultValue: 'offline',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'mikrotik_devices',
  indexes: [
    { fields: ['is_active'] },
    { fields: ['status'] },
  ],
});

module.exports = MikrotikDevice;
