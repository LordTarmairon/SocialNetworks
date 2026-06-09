import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/** Conexión WebSocket autenticada (una sola, reutilizada). */
export function connectSocket(token: string): Socket {
  if (!socket) {
    socket = io(WS_URL, { auth: { token } });
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
