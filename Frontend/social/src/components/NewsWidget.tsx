import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getToken } from '../lib/api';
import { newsApi, type News, type Notification } from '../lib/news';
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

export function NewsWidget() {
  const { user } = useAuth();
  const [news, setNews] = useState<News | null>(null);

  const refresh = useCallback(() => {
    newsApi
      .get()
      .then(setNews)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tiempo real: cuando llega una novedad, refrescamos el panel.
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

  async function markRead() {
    if (!news) return;
    try {
      await newsApi.markRead();
      setNews({
        ...news,
        unread: 0,
        notifications: news.notifications.map((n) => ({ ...n, read: true })),
      });
    } catch {
      /* ignore */
    }
  }

  if (!news) return null;

  return (
    <aside className="news">
      {/* Cabecera: nombre + número de contactos */}
      <div className="news-head">
        <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size={48} />
        <div className="news-head-info">
          <Link className="news-name" to={`/u/${user?.username}`}>
            {user?.displayName}
          </Link>
          <Link className="news-followers" to="/contactos">
            👥 <strong>{news.friendCount}</strong>{' '}
            {news.friendCount === 1 ? 'contacto' : 'contactos'}
          </Link>
        </div>
      </div>

      {news.profileVisits > 0 && (
        <Link className="news-visits" to="/visitas">
          <span className="news-visits-num">{news.profileVisits}</span>
          <span className="news-visits-text">
            {news.profileVisits === 1 ? 'persona ha' : 'personas han'} visto tu
            perfil
          </span>
          <span className="news-visits-arrow">›</span>
        </Link>
      )}

      {/* Logro de número de contactos */}
      {news.milestone && (
        <div className="news-milestone">
          🎉 ¡Has alcanzado <strong>{news.milestone}</strong> contactos!
        </div>
      )}

      {/* Peticiones de amistad */}
      {news.friendRequests > 0 && (
        <Link className="news-item news-requests" to="/contactos">
          <span className="news-ico">👥</span>
          <span>
            <strong>{news.friendRequests}</strong>{' '}
            {news.friendRequests === 1
              ? 'petición de amistad'
              : 'peticiones de amistad'}
          </span>
        </Link>
      )}

      {/* Notificaciones */}
      {news.notifications.length > 0 && (
        <div className="news-section">
          <h3 className="news-title">
            Novedades
            {news.unread > 0 && (
              <button className="news-markread" onClick={markRead}>
                marcar leídas
              </button>
            )}
          </h3>
          {news.notifications.map((n) => (
            <div key={n.id} className={`news-item ${n.read ? '' : 'unread'}`}>
              <Avatar
                name={n.actor.displayName}
                src={n.actor.avatarUrl}
                size={28}
              />
              <span className="news-text">
                <Link className="news-link" to={`/u/${n.actor.username}`}>
                  {n.actor.displayName}
                </Link>{' '}
                {notifText(n)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quién se ha unido */}
      {news.newUsers.length > 0 && (
        <div className="news-section">
          <h3 className="news-title">Recién llegados</h3>
          {news.newUsers.map((u) => (
            <div key={u.id} className="news-item">
              <span className="news-ico">👤</span>
              <span className="news-text">
                <Link className="news-link" to={`/u/${u.username}`}>
                  {u.displayName}
                </Link>{' '}
                se ha unido
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
