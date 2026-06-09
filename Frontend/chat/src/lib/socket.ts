import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/** Abre (una sola vez) la conexión WebSocket autenticada con el token. */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (!socket) {
    socket = io(WS_URL, { auth: { token }, autoConnect: true });
  }
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
