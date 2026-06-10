import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../lib/media';
import { REACTION_EMOJI, REACTION_LABEL, REACTIONS } from '../lib/reactions';
import {
  socialApi,
  type Comment,
  type Post,
  type ReactionType,
} from '../lib/social';
import { Avatar } from './Avatar';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}

interface Props {
  post: Post;
  canDelete?: boolean;
  onDeleted?: (id: string) => void;
}

export function PostCard({ post, canDelete, onDeleted }: Props) {
  const [reactions, setReactions] = useState<Record<string, number>>(
    post.reactions,
  );
  const [myReaction, setMyReaction] = useState<ReactionType | null>(
    post.myReaction,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState('');

  const count = Object.values(reactions).reduce((a, b) => a + b, 0);
  const top = Object.entries(reactions)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 3);

  function apply(next: ReactionType | null) {
    setReactions((prev) => {
      const r = { ...prev };
      if (myReaction) {
        r[myReaction] = (r[myReaction] ?? 1) - 1;
        if (r[myReaction] <= 0) delete r[myReaction];
      }
      if (next) r[next] = (r[next] ?? 0) + 1;
      return r;
    });
    setMyReaction(next);
  }

  async function react(type: ReactionType) {
    const prevR = reactions;
    const prevMy = myReaction;
    apply(type);
    setShowPicker(false);
    try {
      await socialApi.react(post.id, type);
    } catch {
      setReactions(prevR);
      setMyReaction(prevMy);
    }
  }

  async function toggle() {
    if (myReaction) {
      const prevR = reactions;
      const prevMy = myReaction;
      apply(null);
      try {
        await socialApi.unreact(post.id);
      } catch {
        setReactions(prevR);
        setMyReaction(prevMy);
      }
    } else {
      await react('like');
    }
  }

  async function openComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setComments(await socialApi.comments(post.id));
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    const c = await socialApi.addComment(post.id, content);
    setComments((prev) => [...prev, c]);
    setCommentCount((n) => n + 1);
    setCommentText('');
  }

  async function handleDelete() {
    await socialApi.deletePost(post.id);
    onDeleted?.(post.id);
  }

  return (
    <article className="post">
      <header className="post-head">
        <Link to={`/u/${post.author.username}`}>
          <Avatar name={post.author.displayName} src={post.author.avatarUrl} />
        </Link>
        <div className="post-meta">
          <Link className="post-author" to={`/u/${post.author.username}`}>
            {post.author.displayName}
          </Link>
          <span className="post-time">{timeAgo(post.createdAt)}</span>
        </div>
        {canDelete && (
          <button className="post-del" onClick={handleDelete} title="Eliminar">
            ✕
          </button>
        )}
      </header>

      {post.content && <p className="post-content">{post.content}</p>}
      {post.imageUrl && (
        <img className="post-image" src={mediaUrl(post.imageUrl)} alt="" />
      )}

      {count > 0 && (
        <div className="post-reaction-summary">
          <span className="reaction-emojis">
            {top.map((t) => (
              <span key={t}>{REACTION_EMOJI[t]}</span>
            ))}
          </span>
          <span>{count}</span>
        </div>
      )}

      <div className="post-actions">
        <div
          className="react-wrap"
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
        >
          {showPicker && (
            <div className="react-picker">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  className="react-opt"
                  title={r.label}
                  onClick={() => react(r.type)}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <button
            className={`post-action ${myReaction ? 'reacted' : ''}`}
            onClick={toggle}
          >
            {myReaction
              ? `${REACTION_EMOJI[myReaction]} ${REACTION_LABEL[myReaction]}`
              : '👍 Me gusta'}
          </button>
        </div>
        <button className="post-action" onClick={openComments}>
          💬 {commentCount}
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar
                name={c.author.displayName}
                src={c.author.avatarUrl}
                size={30}
              />
              <div className="comment-body">
                <Link
                  className="comment-author"
                  to={`/u/${c.author.username}`}
                >
                  {c.author.displayName}
                </Link>
                <span>{c.content}</span>
              </div>
            </div>
          ))}
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
      )}
    </article>
  );
}
