import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { errorMessage } from '../lib/errors';
import {
  friendsApi,
  type FriendRequest,
  type PublicUser,
  type SearchResult,
} from '../lib/friends';

export function HomePage() {
  const { user, logout } = useAuth();

  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        friendsApi.listFriends(),
        friendsApi.listRequests(),
      ]);
      setFriends(f);
      setRequests(r);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Búsqueda con debounce sencillo.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      friendsApi
        .search(q)
        .then(setResults)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAdd(u: SearchResult) {
    try {
      await friendsApi.sendRequest(u.id);
      setResults((rs) =>
        rs.map((r) =>
          r.id === u.id ? { ...r, relation: 'pending_outgoing' } : r,
        ),
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAccept(req: FriendRequest) {
    try {
      await friendsApi.accept(req.requestId);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function relationLabel(rel: SearchResult['relation']) {
    switch (rel) {
      case 'friends':
        return 'Amigos';
      case 'pending_outgoing':
        return 'Pendiente';
      case 'pending_incoming':
        return 'Te ha agregado';
      default:
        return null;
    }
  }

  return (
    <div className="home-layout">
      <header className="home-header">
        <div className="home-me">
          <Avatar name={user?.displayName ?? '?'} size={36} />
          <strong>{user?.displayName}</strong>
        </div>
        <button className="home-logout" onClick={logout}>
          Salir
        </button>
      </header>

      <main className="contacts">
        {error && <div className="auth-error">{error}</div>}

        {/* Buscador */}
        <section className="contacts-section">
          <input
            className="contacts-search"
            placeholder="Buscar personas por nombre o usuario…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <ul className="contacts-list">
              {searching && <li className="contacts-empty">Buscando…</li>}
              {!searching && results.length === 0 && (
                <li className="contacts-empty">Sin resultados</li>
              )}
              {results.map((u) => (
                <li key={u.id} className="contact-row">
                  <Avatar name={u.displayName} src={u.avatarUrl} />
                  <div className="contact-info">
                    <span className="contact-name">{u.displayName}</span>
                    <span className="contact-username">@{u.username}</span>
                  </div>
                  {u.relation === 'none' ? (
                    <button
                      className="contact-action"
                      onClick={() => handleAdd(u)}
                    >
                      Agregar
                    </button>
                  ) : (
                    <span className="contact-tag">
                      {relationLabel(u.relation)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Solicitudes recibidas */}
        {requests.length > 0 && (
          <section className="contacts-section">
            <h2 className="contacts-title">
              Solicitudes ({requests.length})
            </h2>
            <ul className="contacts-list">
              {requests.map((req) => (
                <li key={req.requestId} className="contact-row">
                  <Avatar
                    name={req.user.displayName}
                    src={req.user.avatarUrl}
                  />
                  <div className="contact-info">
                    <span className="contact-name">
                      {req.user.displayName}
                    </span>
                    <span className="contact-username">
                      @{req.user.username}
                    </span>
                  </div>
                  <button
                    className="contact-action"
                    onClick={() => handleAccept(req)}
                  >
                    Aceptar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Amigos */}
        <section className="contacts-section">
          <h2 className="contacts-title">Contactos ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="contacts-empty">
              Aún no tienes contactos. Busca a alguien arriba para empezar. 👆
            </p>
          ) : (
            <ul className="contacts-list">
              {friends.map((f) => (
                <li key={f.id} className="contact-row">
                  <Avatar name={f.displayName} src={f.avatarUrl} />
                  <div className="contact-info">
                    <span className="contact-name">{f.displayName}</span>
                    <span className="contact-username">@{f.username}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
