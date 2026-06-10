import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { socialApi, type Comment } from '../lib/social';
import { Avatar } from './Avatar';
import { MentionText } from './MentionText';

interface Props {
  comment: Comment;
  postId: string;
  depth?: number;
}

export function CommentItem({ comment, postId, depth = 0 }: Props) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    try {
      if (next) await socialApi.likeComment(comment.id);
      else await socialApi.unlikeComment(comment.id);
    } catch {
      setLiked(!next);
      setLikeCount((n) => n + (next ? -1 : 1));
    }
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    const content = replyText.trim();
    if (!content) return;
    const r = await socialApi.addComment(postId, content, comment.id);
    setReplies((prev) => [...prev, r]);
    setReplyText('');
    setShowReply(false);
  }

  return (
    <div className="comment">
      <Avatar
        name={comment.author.displayName}
        src={comment.author.avatarUrl}
        size={30}
      />
      <div className="comment-main">
        <div className="comment-body">
          <Link className="comment-author" to={`/u/${comment.author.username}`}>
            {comment.author.displayName}
          </Link>
          <MentionText text={comment.content} />
        </div>
        <div className="comment-actions">
          <button
            className={`comment-act ${liked ? 'on' : ''}`}
            onClick={toggleLike}
          >
            {liked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
          </button>
          {depth === 0 && (
            <button
              className="comment-act"
              onClick={() => setShowReply((s) => !s)}
            >
              Responder
            </button>
          )}
        </div>

        {replies.map((r) => (
          <CommentItem
            key={r.id}
            comment={r}
            postId={postId}
            depth={depth + 1}
          />
        ))}

        {showReply && (
          <form className="comment-form" onSubmit={submitReply}>
            <input
              autoFocus
              placeholder="Escribe una respuesta…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button type="submit" disabled={!replyText.trim()}>
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
