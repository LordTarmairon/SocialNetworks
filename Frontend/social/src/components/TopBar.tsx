import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './Avatar';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  function search(e: FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) navigate(`/buscar?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="topbar">
      <Link className="topbar-logo" to="/">
        mellon
      </Link>
      <form className="topbar-search" onSubmit={search}>
        <input
          placeholder="Buscar personas, #hashtags…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </form>
      <nav className="topbar-nav">
        <Link to="/">Inicio</Link>
        <Link to="/contactos">Contactos</Link>
        <Link to="/eventos">Eventos</Link>
        <Link to="/albumes">Fotos</Link>
        <Link to="/guardados">Guardados</Link>
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
