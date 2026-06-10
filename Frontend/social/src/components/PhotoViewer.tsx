import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/errors';
import { friendsApi } from '../lib/friends';
import { mediaUrl } from '../lib/media';
import { photosApi, type Photo, type PhotoComment } from '../lib/photos';
import type { PublicUser } from '../lib/social';
import { Avatar } from './Avatar';
import { MentionText } from './MentionText';

interface Props {
  photo: Photo;
  onClose: () => void;
  onChanged: (photo: Photo) => void;
}

export function PhotoViewer({ photo: initial, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<Photo>(initial);
  const [tagMode, setTagMode] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [query, setQuery] = useState('');
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(initial.caption ?? '');
  const [showTags, setShowTags] = useState(false);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isOwner = user?.id === photo.owner.id;

  useEffect(() => {
    friendsApi.listFriends().then(setFriends).catch(() => {});
  }, []);

  useEffect(() => {
    photosApi.comments(photo.id).then(setComments).catch(() => {});
  }, [photo.id]);

  function update(p: Photo) {
    setPhoto(p);
    onChanged(p);
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    try {
      const c = await photosApi.addComment(photo.id, content);
      setComments((prev) => [...prev, c]);
      setCommentText('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function onImageClick(e: MouseEvent<HTMLDivElement>) {
    // Sin modo etiqueta: un clic muestra/oculta las etiquetas.
    if (!tagMode) {
      if (photo.tags.length > 0) setShowTags((s) => !s);
      return;
    }
    const img = imgRef.current;
    const rect = img ? img.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Solo dentro de la imagen.
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    setPending({ x: Math.round(x), y: Math.round(y) });
    setQuery('');
  }

  async function tagFriend(f: PublicUser) {
    if (!pending) return;
    try {
      const updated = await photosApi.tag(photo.id, f.id, pending.x, pending.y);
      update(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
      setTagMode(false);
    }
  }

  async function removeTag(tagId: string) {
    try {
      update(await photosApi.removeTag(photo.id, tagId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveCaption() {
    try {
      update(await photosApi.updateCaption(photo.id, captionText.trim()));
      setEditingCaption(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const alreadyTagged = new Set(photo.tags.map((t) => t.user.id));
  // Puedes etiquetarte a ti mismo además de a tus contactos.
  const taggable: PublicUser[] = user
    ? [
        {
          id: user.id,
          username: user.username,
          displayName: `${user.displayName} (tú)`,
          avatarUrl: user.avatarUrl ?? null,
        },
        ...friends,
      ]
    : friends;
  const candidates = taggable.filter(
    (f) =>
      !alreadyTagged.has(f.id) &&
      (f.displayName.toLowerCase().includes(query.toLowerCase()) ||
        f.username.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="photo-overlay" onClick={onClose}>
      <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="photo-close" onClick={onClose}>
          ✕
        </button>

        <div className="photo-stage">
          <div
            className={`photo-img-wrap ${tagMode ? 'tagging' : ''}`}
            onClick={onImageClick}
          >
          <img ref={imgRef} src={mediaUrl(photo.url)} alt="" />

          {/* Pista para ver etiquetas */}
          {!tagMode && !showTags && photo.tags.length > 0 && (
            <span className="tag-hint">🏷️ Toca la foto para ver las etiquetas</span>
          )}

          {/* Marcadores de etiquetas (al activar con un clic o en modo etiquetar) */}
          {(showTags || tagMode) &&
            photo.tags
              .filter((t) => t.x != null && t.y != null)
              .map((t) => (
              <div
                key={t.id}
                className="tag-marker"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
              >
                <span className="tag-dot" />
                <span className="tag-label">
                  <Link
                    className="tag-link"
                    to={`/u/${t.user.username}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.user.displayName}
                  </Link>
                  {(isOwner || t.user.id === user?.id) && (
                    <button
                      className="tag-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeTag(t.id);
                      }}
                      title="Quitar etiqueta"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            ))}

          {/* Selector tras hacer clic en la imagen */}
          {pending && (
            <div
              className="tag-picker"
              style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                placeholder="¿A quién etiquetas?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul>
                {candidates.slice(0, 5).map((f) => (
                  <li key={f.id} onClick={() => tagFriend(f)}>
                    {f.displayName}
                  </li>
                ))}
                {candidates.length === 0 && (
                  <li className="muted">Sin contactos</li>
                )}
              </ul>
            </div>
          )}
          </div>
        </div>

        <div className="photo-side">
          {error && <div className="auth-error">{error}</div>}

          <div className="photo-owner">
            Foto de <strong>{photo.owner.displayName}</strong>
          </div>

          {/* Pie de foto con menciones */}
          {editingCaption ? (
            <div className="caption-edit">
              <textarea
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                rows={3}
                placeholder="Escribe un pie de foto… puedes mencionar con @usuario"
              />
              <div className="edit-actions">
                <button
                  className="btn-ghost"
                  onClick={() => setEditingCaption(false)}
                >
                  Cancelar
                </button>
                <button className="btn-green" onClick={saveCaption}>
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <p className="photo-caption">
              {photo.caption ? (
                <MentionText text={photo.caption} />
              ) : (
                <span className="muted">Sin pie de foto</span>
              )}
              {isOwner && (
                <button
                  className="link-btn"
                  onClick={() => {
                    setCaptionText(photo.caption ?? '');
                    setEditingCaption(true);
                  }}
                >
                  ✏️
                </button>
              )}
            </p>
          )}

          {/* Etiquetas listadas */}
          <div className="photo-tags-list">
            <strong>Etiquetadas:</strong>{' '}
            {photo.tags.length === 0 ? (
              <span className="muted">nadie aún</span>
            ) : (
              photo.tags.map((t) => t.user.displayName).join(', ')
            )}
          </div>

          <button
            className={`btn-green ${tagMode ? 'active' : ''}`}
            onClick={() => {
              setTagMode((m) => !m);
              setPending(null);
            }}
          >
            {tagMode ? 'Toca la foto para etiquetar…' : '🏷️ Etiquetar a alguien'}
          </button>

          {/* Comentarios de la foto */}
          <div className="photo-comments">
            <strong>Comentarios ({comments.length})</strong>
            <div className="photo-comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <Avatar
                    name={c.author.displayName}
                    src={c.author.avatarUrl}
                    size={28}
                  />
                  <div className="comment-body">
                    <Link
                      className="comment-author"
                      to={`/u/${c.author.username}`}
                    >
                      {c.author.displayName}
                    </Link>
                    <MentionText text={c.content} />
                  </div>
                </div>
              ))}
            </div>
            <form className="comment-form" onSubmit={submitComment}>
              <input
                placeholder="Escribe un comentario…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" disabled={!commentText.trim()}>
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
