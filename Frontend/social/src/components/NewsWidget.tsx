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

  if (!news) return null;

  return (
    <aside className="news">
      {/* Cabecera con visitas a tu perfil */}
      <div className="news-head">
        <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size={48} />
        <div>
          <Link className="news-name" to={`/u/${user?.username}`}>
            {user?.displayName}
          </Link>
          <div className="news-visits">
            📊 <strong>{news.profileVisits}</strong>{' '}
            {news.profileVisits === 1 ? 'visita' : 'visitas'} a tu perfil
          </div>
        </div>
      </div>

      {/* Logro de número de contactos */}
      {news.milestone && (
        <div className="news-milestone">
          🎉 ¡Has alcanzado <strong>{news.milestone}</strong> contactos!
        </div>
      )}

      {/* Peticiones de amistad */}
      {news.friendRequests > 0 && (
        <div className="news-item news-requests">
          <span className="news-ico">👥</span>
          <span>
            <strong>{news.friendRequests}</strong>{' '}
            {news.friendRequests === 1
              ? 'petición de amistad'
              : 'peticiones de amistad'}
          </span>
        </div>
      )}

      {/* Notificaciones */}
      {news.notifications.length > 0 && (
        <div className="news-section">
          <h3 className="news-title">Novedades</h3>
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
