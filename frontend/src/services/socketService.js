import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (userId, role) => {
  if (socket?.connected) return socket;

  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    // Unirse a sala de admins si corresponde
    if (role === 'admin') {
      socket.emit('join_room', 'admins');
    }
    // Siempre unirse a sala personal del vendedor
    if (userId) {
      socket.emit('join_room', `seller_${userId}`);
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
