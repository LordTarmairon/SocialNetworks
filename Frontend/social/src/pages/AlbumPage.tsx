import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PhotoViewer } from '../components/PhotoViewer';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadImage } from '../lib/media';
import { photosApi, type Album, type Photo } from '../lib/photos';

export function AlbumPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setAlbum(await photosApi.getAlbum(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOwner = album?.owner.id === user?.id;

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      const photo = await photosApi.addPhoto(id, url);
      setAlbum((prev) =>
        prev ? { ...prev, photos: [...prev.photos, photo] } : prev,
      );
      setSelected(photo); // abrir el visor para etiquetar / pie de foto
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onPhotoChanged(updated: Photo) {
    setAlbum((prev) =>
      prev
        ? {
            ...prev,
            photos: prev.photos.map((p) => (p.id === updated.id ? updated : p)),
          }
        : prev,
    );
    setSelected(updated);
  }

  return (
    <>
      <TopBar />
      <main className="feed">
        {error && <div className="auth-error">{error}</div>}

        {album && (
          <>
            <div className="events-head">
              <div>
                <h1 className="section-title" style={{ margin: 0 }}>
                  {album.title}
                </h1>
                {album.description && (
                  <p className="muted">{album.description}</p>
                )}
              </div>
              {isOwner && (
                <button
                  className="btn-green"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Subiendo…' : '➕ Añadir foto'}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onUpload}
            />

            {album.photos.length === 0 ? (
              <p className="muted">Este álbum aún no tiene fotos.</p>
            ) : (
              <div className="photo-grid">
                {album.photos.map((p) => (
                  <button
                    key={p.id}
                    className="photo-thumb"
                    onClick={() => setSelected(p)}
                  >
                    <img src={mediaUrl(p.url)} alt="" />
                    {(p.tags?.length ?? 0) > 0 && (
                      <span className="photo-thumb-tags">
                        🏷️ {p.tags.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <PhotoViewer
          photo={selected}
          onClose={() => setSelected(null)}
          onChanged={onPhotoChanged}
        />
      )}
    </>
  );
}
