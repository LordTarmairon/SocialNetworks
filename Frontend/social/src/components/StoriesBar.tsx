import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { mediaUrl, uploadImage } from '../lib/media';
import { socialApi, type StoryGroup, type StoryViewer } from '../lib/social';
import { Avatar } from './Avatar';

interface Props {
  groups: StoryGroup[];
  onChanged: () => void;
}

const STORY_DURATION = 5000;
const STORY_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export function StoriesBar({ groups, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<StoryGroup | null>(null);
  const [index, setIndex] = useState(0);
  const [reacted, setReacted] = useState<Record<string, string | null>>({});
  const [viewersFor, setViewersFor] = useState<string | null>(null);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);

  const current = viewer ? viewer.stories[index] : null;

  // Registrar la vista al mostrar una historia ajena.
  useEffect(() => {
    if (!current || current.mine) return;
    socialApi.viewStory(current.id).catch(() => {});
  }, [current?.id, current?.mine]);

  // Auto-avance (pausado si la lista de vistas está abierta).
  useEffect(() => {
    if (!viewer || viewersFor) return;
    const isLast = index >= viewer.stories.length - 1;
    const t = setTimeout(() => {
      if (isLast) setViewer(null);
      else setIndex((i) => i + 1);
    }, STORY_DURATION);
    return () => clearTimeout(t);
  }, [viewer, index, viewersFor]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await socialApi.createStory(url);
      onChanged();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function open(group: StoryGroup) {
    setViewer(group);
    setIndex(0);
    setViewersFor(null);
  }

  function advance() {
    if (!viewer) return;
    if (index + 1 < viewer.stories.length) setIndex((i) => i + 1);
    else setViewer(null);
  }

  function react(emoji: string) {
    if (!current) return;
    const cur =
      reacted[current.id] !== undefined
        ? reacted[current.id]
        : (current.myReaction ?? null);
    if (cur === emoji) {
      socialApi.unreactStory(current.id).catch(() => {});
      setReacted((p) => ({ ...p, [current.id]: null }));
    } else {
      socialApi.reactStory(current.id, emoji).catch(() => {});
      setReacted((p) => ({ ...p, [current.id]: emoji }));
    }
  }

  async function openViewers() {
    if (!current) return;
    try {
      setViewers(await socialApi.storyViewers(current.id));
      setViewersFor(current.id);
    } catch {
      /* ignore */
    }
  }

  const myReaction = current
    ? reacted[current.id] !== undefined
      ? reacted[current.id]
      : (current.myReaction ?? null)
    : null;

  return (
    <div className="stories">
      <button
        className="story-add"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <div className="story-add-circle">{uploading ? '…' : '+'}</div>
        <span>Tu story</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

      {groups.map((g) => (
        <button key={g.author.id} className="story-item" onClick={() => open(g)}>
          <div className="story-ring">
            <Avatar name={g.author.displayName} src={g.author.avatarUrl} size={56} />
          </div>
          <span>{g.author.displayName.split(' ')[0]}</span>
        </button>
      ))}

      {viewer && current && (
        <div className="story-viewer" onClick={advance}>
          <div className="story-progress">
            {viewer.stories.map((s, i) => (
              <div key={s.id} className="story-seg">
                <div
                  key={`${s.id}-${i === index}`}
                  className={`story-seg-fill ${i < index ? 'done' : ''} ${
                    i === index ? 'active' : ''
                  }`}
                  style={
                    i === index
                      ? { animationDuration: `${STORY_DURATION}ms` }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
          <button
            className="story-viewer-close"
            onClick={(e) => {
              e.stopPropagation();
              setViewer(null);
            }}
          >
            ✕
          </button>
          <img src={mediaUrl(current.imageUrl)} alt="story" />
          <div className="story-viewer-name">{viewer.author.displayName}</div>

          {/* Pie: reacciones (historias ajenas) o vistas (las tuyas) */}
          {current.mine ? (
            <button
              className="story-views"
              onClick={(e) => {
                e.stopPropagation();
                void openViewers();
              }}
            >
              👁 {current.viewCount ?? 0} · ❤️ {current.reactionCount ?? 0} —
              ver quién la vio
            </button>
          ) : (
            <div
              className="story-reactions"
              onClick={(e) => e.stopPropagation()}
            >
              {STORY_EMOJIS.map((em) => (
                <button
                  key={em}
                  className={`story-react ${myReaction === em ? 'on' : ''}`}
                  onClick={() => react(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Lista de quién ha visto la historia */}
          {viewersFor && (
            <div
              className="story-viewers-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="story-viewers-head">
                <strong>Vistas ({viewers.length})</strong>
                <button onClick={() => setViewersFor(null)}>✕</button>
              </div>
              <ul>
                {viewers.length === 0 && (
                  <li className="muted">Nadie la ha visto aún.</li>
                )}
                {viewers.map((v) => (
                  <li key={v.id}>
                    <Avatar name={v.displayName} src={v.avatarUrl} size={28} />
                    <span>{v.displayName}</span>
                    {v.emoji && <span className="vw-emoji">{v.emoji}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
