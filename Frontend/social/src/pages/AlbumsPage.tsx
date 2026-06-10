import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { mediaUrl } from '../lib/media';
import { photosApi, type AlbumSummary } from '../lib/photos';

export function AlbumsPage() {
  const { user } = useAuth();
  const { username } = useParams();
  const target = username ?? user?.username ?? '';
  const isMe = target === user?.username;

  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    try {
      setAlbums(await photosApi.listAlbums(target));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    if (target) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const album = await photosApi.createAlbum(
        title.trim(),
        description.trim() || undefined,
      );
      setAlbums((prev) => [album, ...prev]);
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <TopBar />
      <main className="feed">
        {error && <div className="auth-error">{error}</div>}

        <div className="events-head">
          <h1 className="section-title" style={{ margin: 0 }}>
            {isMe ? 'Mis álbumes' : `Álbumes de @${target}`}
          </h1>
          {isMe && (
            <button className="btn-green" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cerrar' : 'Crear álbum'}
            </button>
          )}
        </div>

        {showForm && (
          <form className="card-section event-form" onSubmit={create}>
            <input
              placeholder="Título del álbum"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <input
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button className="btn-green" type="submit">
              Crear
            </button>
          </form>
        )}

        {albums.length === 0 ? (
          <p className="muted">No hay álbumes todavía.</p>
        ) : (
          <div className="album-grid">
            {albums.map((a) => (
              <Link key={a.id} to={`/album/${a.id}`} className="album-card">
                <div className="album-cover">
                  {a.coverUrl ? (
                    <img src={mediaUrl(a.coverUrl)} alt="" />
                  ) : (
                    <span className="album-empty">📷</span>
                  )}
                </div>
                <div className="album-info">
                  <span className="album-title">{a.title}</span>
                  <span className="muted">{a.photoCount} fotos</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
