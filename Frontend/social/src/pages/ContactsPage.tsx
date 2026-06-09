import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import {
  friendsApi,
  type FriendRequest,
  type SearchResult,
} from '../lib/friends';
import type { PublicUser } from '../lib/social';

export function ContactsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([
        friendsApi.listRequests(),
        friendsApi.listFriends(),
      ]);
      setRequests(r);
      setFriends(f);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  async function add(u: SearchResult) {
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

  async function accept(req: FriendRequest) {
    try {
      await friendsApi.accept(req.requestId);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function reject(req: FriendRequest) {
    try {
      await friendsApi.reject(req.requestId);
      setRequests((rs) => rs.filter((r) => r.requestId !== req.requestId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function relationLabel(rel: SearchResult['relation']) {
    if (rel === 'friends') return 'Ya sois contactos';
    if (rel === 'pending_outgoing') return 'Pendiente';
    if (rel === 'pending_incoming') return 'Te ha agregado';
    return null;
  }

  return (
    <>
      <TopBar />
      <main className="feed">
        {error && <div className="auth-error">{error}</div>}

        <section className="card-section">
          <h2 className="section-title">Buscar personas</h2>
          <input
            className="contacts-search"
            placeholder="Nombre o usuario…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <ul className="people-list">
              {searching && <li className="muted">Buscando…</li>}
              {!searching && results.length === 0 && (
                <li className="muted">Sin resultados</li>
              )}
              {results.map((u) => (
                <li key={u.id} className="person-row">
                  <Link to={`/u/${u.username}`} className="person-info">
                    <Avatar name={u.displayName} src={u.avatarUrl} />
                    <div>
                      <span className="person-name">{u.displayName}</span>
                      <span className="person-username">@{u.username}</span>
                    </div>
                  </Link>
                  {u.relation === 'none' ? (
                    <button className="btn-green" onClick={() => add(u)}>
                      Agregar
                    </button>
                  ) : (
                    <span className="muted">{relationLabel(u.relation)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {requests.length > 0 && (
          <section className="card-section">
            <h2 className="section-title">
              Peticiones de amistad ({requests.length})
            </h2>
            <ul className="people-list">
              {requests.map((req) => (
                <li key={req.requestId} className="person-row">
                  <Link to={`/u/${req.user.username}`} className="person-info">
                    <Avatar
                      name={req.user.displayName}
                      src={req.user.avatarUrl}
                    />
                    <div>
                      <span className="person-name">
                        {req.user.displayName}
                      </span>
                      <span className="person-username">
                        @{req.user.username}
                      </span>
                    </div>
                  </Link>
                  <div className="row-actions">
                    <button className="btn-green" onClick={() => accept(req)}>
                      Aceptar
                    </button>
                    <button className="btn-ghost" onClick={() => reject(req)}>
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card-section">
          <h2 className="section-title">Tus contactos ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="muted">
              Aún no tienes contactos. Busca a alguien arriba para empezar.
            </p>
          ) : (
            <ul className="people-list">
              {friends.map((f) => (
                <li key={f.id} className="person-row">
                  <Link to={`/u/${f.username}`} className="person-info">
                    <Avatar name={f.displayName} src={f.avatarUrl} />
                    <div>
                      <span className="person-name">{f.displayName}</span>
                      <span className="person-username">@{f.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
