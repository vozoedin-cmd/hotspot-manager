const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true, len: [2, 100] },
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'seller'),
    defaultValue: 'seller',
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  two_fa_secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  two_fa_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  device_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'mikrotik_devices', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['role'] },
    { fields: ['is_active'] },
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.refresh_token;
  delete values.two_fa_secret;
  return values;
};

module.exports = User;
