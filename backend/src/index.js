require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./config/database');
const logger = require('./config/logger');
const syncService = require('./services/syncService');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Socket.io para actualizaciones en tiempo real
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
  },
});

// Exportar io para uso en controladores
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} unido a sala: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// Conectar base de datos e iniciar servidor
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Conexión a PostgreSQL establecida correctamente');

    await sequelize.sync({ alter: true });
    logger.info('Modelos sincronizados con la base de datos');

    // Iniciar sincronización periódica con MikroTik
    syncService.startScheduler(io);
    logger.info('Scheduler de sincronización MikroTik iniciado');

    server.listen(PORT, () => {
      logger.info(`Servidor iniciado en puerto ${PORT} - Modo: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada:', error);
  process.exit(1);
});
