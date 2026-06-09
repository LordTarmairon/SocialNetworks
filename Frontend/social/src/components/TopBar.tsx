import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './Avatar';

export function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link className="topbar-logo" to="/">
        mellon
      </Link>
      <nav className="topbar-nav">
        <Link to="/">Inicio</Link>
        <Link to="/contactos">Contactos</Link>
        <Link to="/eventos">Eventos</Link>
        {user && (
          <Link to={`/u/${user.username}`} className="topbar-me">
            <Avatar name={user.displayName} src={user.avatarUrl} size={30} />
            <span>{user.displayName}</span>
          </Link>
        )}
        <button className="topbar-logout" onClick={logout}>
          Salir
        </button>
      </nav>
    </header>
  );
}
