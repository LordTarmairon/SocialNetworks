import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { TopBar } from '../components/TopBar';
import { friendsApi, type SearchResult } from '../lib/friends';
import { socialApi, type Post } from '../lib/social';

export function SearchPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [users, setUsers] = useState<SearchResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setUsers([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    Promise.all([
      term.startsWith('#') ? Promise.resolve([]) : friendsApi.search(term),
      socialApi.searchPosts(term),
    ])
      .then(([u, p]) => {
        setUsers(u);
        setPosts(p);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <>
      <TopBar />
      <main className="feed">
        <h1 className="section-title">
          Resultados para “{q}”
        </h1>
        {loading && <p className="muted">Buscando…</p>}

        {users.length > 0 && (
          <section className="card-section">
            <h2 className="section-title">Personas</h2>
            <ul className="people-list">
              {users.map((u) => (
                <li key={u.id} className="person-row">
                  <Link to={`/u/${u.username}`} className="person-info">
                    <Avatar name={u.displayName} src={u.avatarUrl} />
                    <div>
                      <span className="person-name">{u.displayName}</span>
                      <span className="person-username">@{u.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {posts.length > 0 ? (
          <>
            <h2 className="section-title">Publicaciones</h2>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                canDelete={p.author.id === user?.id}
                onDeleted={(id) =>
                  setPosts((prev) => prev.filter((x) => x.id !== id))
                }
              />
            ))}
          </>
        ) : (
          !loading &&
          users.length === 0 && (
            <p className="muted">Sin resultados para esta búsqueda.</p>
          )
        )}
      </main>
    </>
  );
}
