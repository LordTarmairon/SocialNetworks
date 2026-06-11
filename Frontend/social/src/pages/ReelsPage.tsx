import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CommentItem } from '../components/CommentItem';
import { MentionText } from '../components/MentionText';
import { TopBar } from '../components/TopBar';
import { ReelComposer } from '../components/ReelComposer';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadVideo } from '../lib/media';
import { socialApi, type Comment, type Post } from '../lib/social';

export function ReelsPage() {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setReels(await socialApi.reels());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onPickVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (file) setPendingVideo(file); // abre el compositor
  }

  async function onComposed(blob: Blob, caption: string) {
    setPendingVideo(null);
    setUploading(true);
    setError(null);
    try {
      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const file = new File([blob], `reel.${ext}`, {
        type: blob.type || 'video/webm',
      });
      const url = await uploadVideo(file);
      const reel = await socialApi.createReel(url, caption);
      setReels((prev) => [reel, ...prev]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function onReacted(updated: Post) {
    setReels((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <>
      <TopBar />
      <div className="reels-page">
        <div className="reels-head">
          <h2>Reels</h2>
          <button
            className="reels-upload"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo…' : '＋ Subir reel'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            hidden
            onChange={onPickVideo}
          />
        </div>
        {error && <div className="auth-error reels-error">{error}</div>}

        {loading ? (
          <p className="reels-empty">Cargando reels…</p>
        ) : reels.length === 0 ? (
          <p className="reels-empty">
            Aún no hay reels. ¡Sube el primero con “Subir reel”!
          </p>
        ) : (
          <div className="reels-scroller">
            {reels.map((r) => (
              <ReelItem key={r.id} reel={r} onReacted={onReacted} />
            ))}
          </div>
        )}
      </div>
      {pendingVideo && (
        <ReelComposer
          file={pendingVideo}
          onCancel={() => setPendingVideo(null)}
          onDone={onComposed}
        />
      )}
    </>
  );
}

function ReelItem({
  reel,
  onReacted,
}: {
  reel: Post;
  onReacted: (p: Post) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(reel.commentCount);
  const liked = reel.myReaction === 'love' || reel.myReaction === 'like';

  async function openComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      try {
        setComments(await socialApi.comments(reel.id));
      } catch {
        /* ignore */
      }
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    try {
      const c = await socialApi.addComment(reel.id, content);
      setComments((prev) => [...prev, c]);
      setCommentText('');
      setCommentCount((n) => n + 1);
    } catch {
      /* ignore */
    }
  }

  // Reproduce el reel cuando entra en pantalla; pausa cuando sale.
  useEffect(() => {
    const el = wrapRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
          setPaused(false);
        } else {
          vid.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function togglePlay() {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setPaused(false);
    } else {
      vid.pause();
      setPaused(true);
    }
  }

  async function toggleLike() {
    try {
      if (liked) {
        await socialApi.unreact(reel.id);
        onReacted({
          ...reel,
          myReaction: null,
          reactionCount: Math.max(0, reel.reactionCount - 1),
        });
      } else {
        await socialApi.react(reel.id, 'love');
        onReacted({
          ...reel,
          myReaction: 'love',
          reactionCount: reel.reactionCount + 1,
        });
      }
    } catch {
      /* noop */
    }
  }

  return (
    <div className="reel" ref={wrapRef}>
      <video
        ref={videoRef}
        src={mediaUrl(reel.videoUrl)}
        loop
        muted
        playsInline
        onClick={togglePlay}
      />
      {paused && (
        <button className="reel-play" onClick={togglePlay} aria-label="Reproducir">
          ▶
        </button>
      )}
      <div className="reel-overlay">
        <Link to={`/u/${reel.author.username}`} className="reel-author">
          <Avatar
            name={reel.author.displayName}
            src={reel.author.avatarUrl}
            size={38}
          />
          <span>{reel.author.displayName}</span>
        </Link>
        {reel.content && (
          <p className="reel-caption">
            <MentionText text={reel.content} />
          </p>
        )}
      </div>
      <div className="reel-actions">
        <button
          className={`reel-like ${liked ? 'on' : ''}`}
          onClick={toggleLike}
          aria-label="Me gusta"
        >
          {liked ? '❤️' : '🤍'}
          <span>{reel.reactionCount}</span>
        </button>
        <button
          className="reel-comments"
          title="Comentarios"
          onClick={openComments}
        >
          💬
          <span>{commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="reel-comments-panel">
          <div className="rcp-head">
            <strong>Comentarios</strong>
            <button onClick={() => setShowComments(false)} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="rcp-list">
            {comments.length === 0 ? (
              <p className="rcp-empty">Sé el primero en comentar</p>
            ) : (
              comments.map((c) => (
                <CommentItem key={c.id} comment={c} postId={reel.id} />
              ))
            )}
          </div>
          <form className="rcp-form" onSubmit={submitComment}>
            <input
              placeholder="Añade un comentario…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" disabled={!commentText.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
