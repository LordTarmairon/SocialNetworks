import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { friendsApi, type SearchResult } from '../lib/friends';
import { Avatar } from './Avatar';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Búsqueda en vivo: desde 2 caracteres, con debounce y tope de resultados.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2 || q.startsWith('#')) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      friendsApi
        .search(q)
        .then((r) => {
          setResults(r.slice(0, 6));
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  // Cerrar el desplegable al hacer clic fuera.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function search(e: FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) {
      setOpen(false);
      navigate(`/buscar?q=${encodeURIComponent(q)}`);
    }
  }

  function go(username: string) {
    setOpen(false);
    setTerm('');
    navigate(`/u/${username}`);
  }

  return (
    <header className="topbar">
      <Link className="topbar-logo" to="/">
        mellon
      </Link>
      <div className="topbar-search" ref={boxRef}>
        <form onSubmit={search}>
          <input
            placeholder="Buscar personas, #hashtags…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
        </form>
        {open && results.length > 0 && (
          <ul className="search-dropdown">
            {results.map((u) => (
              <li key={u.id} onClick={() => go(u.username)}>
                <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
                <div className="sd-info">
                  <span className="sd-name">{u.displayName}</span>
                  <span className="sd-username">@{u.username}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
