import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { newsApi, type News, type Notification } from '../lib/news';
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
    case 'profile_view':
      return 'ha visto tu perfil';
    default:
      return '';
  }
}

export function NewsWidget() {
  const { user } = useAuth();
  const [news, setNews] = useState<News | null>(null);

  useEffect(() => {
    newsApi.get().then(setNews).catch(() => {});
  }, []);

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
      {/* Cabecera con visitas a tu perfil */}
      <div className="news-head">
        <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size={48} />
        <Link className="news-name" to={`/u/${user?.username}`}>
          {user?.displayName}
        </Link>
      </div>

      <div className="news-visits">
        <span className="news-visits-num">{news.profileVisits}</span>
        <span>
          {news.profileVisits === 1 ? 'persona ha' : 'personas han'} visto tu
          perfil
        </span>
      </div>

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
