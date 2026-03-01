const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Package = sequelize.define('Package', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre del paquete (ej: 1 Hora, 1 Día, 7 Días)',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration_value: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Valor numérico de la duración',
  },
  duration_unit: {
    type: DataTypes.ENUM('minutes', 'hours', 'days', 'weeks', 'months'),
    allowNull: false,
    defaultValue: 'hours',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Precio de venta al público (en Quetzales)',
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Costo que se descuenta del saldo del vendedor',
  },
  speed_download: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Velocidad de descarga (ej: 2M)',
  },
  speed_upload: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Velocidad de subida (ej: 1M)',
  },
  // Nombre del perfil en MikroTik
  mikrotik_profile: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#3B82F6',
    comment: 'Color hex para UI',
  },
}, {
  tableName: 'packages',
  indexes: [
    { fields: ['is_active'] },
  ],
});

Package.prototype.getDurationLabel = function () {
  const labels = {
    minutes: 'Minuto(s)',
    hours: 'Hora(s)',
    days: 'Día(s)',
    weeks: 'Semana(s)',
    months: 'Mes(es)',
  };
  return `${this.duration_value} ${labels[this.duration_unit]}`;
};

Package.prototype.getDurationInMinutes = function () {
  const multipliers = {
    minutes: 1,
    hours: 60,
    days: 1440,
    weeks: 10080,
    months: 43200,
  };
  return this.duration_value * multipliers[this.duration_unit];
};

module.exports = Package;
