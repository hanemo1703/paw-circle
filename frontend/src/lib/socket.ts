import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from './api';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function connectSocket(token: string): Socket {
  if (socket && socketToken === token) return socket;
  if (socket) socket.disconnect();
  socket = io(API_ORIGIN, { auth: { token } });
  socketToken = token;
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
