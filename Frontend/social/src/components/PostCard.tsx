import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { mediaUrl } from '../lib/media';
import { socialApi, type Comment, type Post } from '../lib/social';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  post: Post;
  canDelete?: boolean;
  onDeleted?: (id: string) => void;
}

export function PostCard({ post, canDelete, onDeleted }: Props) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState('');

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await socialApi.like(post.id);
      else await socialApi.unlike(post.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
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

      <div className="post-actions">
        <button
          className={`post-action ${liked ? 'liked' : ''}`}
          onClick={toggleLike}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
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
