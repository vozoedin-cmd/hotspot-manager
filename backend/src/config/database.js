const { Sequelize } = require('sequelize');
const logger = require('./logger');

const dialect = process.env.DB_DIALECT || 'postgres';
const storage = process.env.DB_STORAGE || './database.sqlite';

const sequelize = new Sequelize(
  dialect === 'sqlite' ? storage : process.env.DB_NAME,
  dialect === 'sqlite' ? undefined : process.env.DB_USER,
  dialect === 'sqlite' ? undefined : process.env.DB_PASS || process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect,
    storage: dialect === 'sqlite' ? storage : undefined,
    logging: (msg) => logger.debug(msg),
    pool: dialect === 'sqlite' ? undefined : {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = { sequelize, Sequelize };
