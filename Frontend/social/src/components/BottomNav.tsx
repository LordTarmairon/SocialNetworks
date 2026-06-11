import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useUnreadMessages } from '../lib/useUnreadMessages';

const ITEMS = [
  { to: '/', icon: '🏠', label: 'Inicio', end: true },
  { to: '/reels', icon: '🎬', label: 'Reels' },
  { to: '/mensajes', icon: '💬', label: 'Mensajes' },
  { to: '/albumes', icon: '📷', label: 'Fotos' },
];

/** Barra de navegación inferior, visible solo en móvil (CSS). */
export function BottomNav() {
  const { user } = useAuth();
  const unread = useUnreadMessages();
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}
        >
          <span className="bn-icon">
            {it.icon}
            {it.to === '/mensajes' && unread > 0 && (
              <span className="bn-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </span>
          <span className="bn-label">{it.label}</span>
        </NavLink>
      ))}
      <NavLink
        to={user ? `/u/${user.username}` : '/'}
        className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}
      >
        <span className="bn-icon">👤</span>
        <span className="bn-label">Perfil</span>
      </NavLink>
    </nav>
  );
}
