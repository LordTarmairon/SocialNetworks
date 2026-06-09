import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { newsApi, type Visitor } from '../lib/news';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    newsApi
      .visitors()
      .then(setVisitors)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar />
      <main className="feed">
        {error && <div className="auth-error">{error}</div>}

        <section className="card-section">
          <h1 className="section-title">
            Han visitado tu perfil ({visitors.length})
          </h1>
          {loading ? (
            <p className="muted">Cargando…</p>
          ) : visitors.length === 0 ? (
            <p className="muted">Todavía nadie ha visto tu perfil.</p>
          ) : (
            <ul className="people-list">
              {visitors.map((v) => (
                <li key={v.id} className="person-row">
                  <Link to={`/u/${v.username}`} className="person-info">
                    <Avatar name={v.displayName} src={v.avatarUrl} />
                    <div>
                      <span className="person-name">{v.displayName}</span>
                      <span className="person-username">
                        @{v.username} · {timeAgo(v.visitedAt)}
                      </span>
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
