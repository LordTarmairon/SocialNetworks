import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getToken } from '../lib/api';
import { newsApi, type Notification } from '../lib/news';
import { connectSocket } from '../lib/socket';
import { Avatar } from './Avatar';

function notifText(n: Notification): string {
  switch (n.type) {
    case 'like':
      return 'le gusta tu publicación';
    case 'comment':
      return 'comentó tu publicación';
    case 'friend_request':
      return 'te ha enviado una solicitud';
    case 'friend_accept':
      return 'ya es tu contacto';
    case 'mention':
      return 'te ha etiquetado en una publicación';
    case 'photo_tag':
      return 'te ha etiquetado en una foto';
    case 'profile_view':
      return 'ha visto tu perfil';
    case 'follow':
      return 'ha empezado a seguirte';
    default:
      return '';
  }
}

/** Campana de notificaciones del TopBar: contador en vivo + desplegable. */
export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    newsApi
      .get()
      .then((n) => {
        setItems(n.notifications);
        setUnread(n.unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tiempo real: cada novedad refresca el contador y la lista.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = connectSocket(token);
    const onUpdate = () => refresh();
    socket.on('news:update', onUpdate);
    return () => {
      socket.off('news:update', onUpdate);
    };
  }, [refresh]);

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Al abrir, marcamos como leídas.
    if (next && unread > 0) {
      try {
        await newsApi.markRead();
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="notif-bell" ref={boxRef}>
      <button
        className="notif-bell-btn"
        onClick={toggle}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        🔔
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dd-head">Notificaciones</div>
          {items.length === 0 ? (
            <div className="notif-empty">No tienes notificaciones</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id} className={`notif-row ${n.read ? '' : 'unread'}`}>
                  <Link
                    to={`/u/${n.actor.username}`}
                    onClick={() => setOpen(false)}
                  >
                    <Avatar
                      name={n.actor.displayName}
                      src={n.actor.avatarUrl}
                      size={32}
                    />
                    <span className="notif-text">
                      <strong>{n.actor.displayName}</strong> {notifText(n)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
