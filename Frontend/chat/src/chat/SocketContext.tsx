import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { getToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const SocketContext = createContext<Socket | null>(null);

/** Mantiene una conexión WebSocket viva mientras haya sesión iniciada. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (user && token) {
      setSocket(connectSocket(token));
    } else {
      disconnectSocket();
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
