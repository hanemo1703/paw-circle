import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(API_ORIGIN, { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
