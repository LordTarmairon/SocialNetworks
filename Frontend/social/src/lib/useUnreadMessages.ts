import { useCallback, useEffect, useState } from 'react';
import { getToken } from './api';
import { chatApi } from './chat';
import { connectSocket } from './socket';

/** Evento global para refrescar el contador tras leer una conversación. */
export const MESSAGES_READ_EVENT = 'sn:messages-read';

/** Nº de mensajes privados sin leer, en vivo (socket + evento de lectura). */
export function useUnreadMessages(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!getToken()) return;
    chatApi
      .unreadCount()
      .then((r) => setCount(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const token = getToken();
    const socket = token ? connectSocket(token) : null;
    const onNew = () => refresh();
    socket?.on('message:new', onNew);
    window.addEventListener(MESSAGES_READ_EVENT, refresh);
    return () => {
      socket?.off('message:new', onNew);
      window.removeEventListener(MESSAGES_READ_EVENT, refresh);
    };
  }, [refresh]);

  return count;
}
