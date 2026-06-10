import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PostCard } from '../components/PostCard';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { socialApi, type Post } from '../lib/social';

export function SavedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socialApi
      .saved()
      .then(setPosts)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar />
      <main className="feed">
        <h1 className="section-title">Guardados</h1>
        {error && <div className="auth-error">{error}</div>}
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : posts.length === 0 ? (
          <p className="muted">
            No has guardado nada todavía. Usa el marcador 🏷️ en una publicación.
          </p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              canDelete={p.author.id === user?.id}
              onDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))
        )}
      </main>
    </>
  );
}
