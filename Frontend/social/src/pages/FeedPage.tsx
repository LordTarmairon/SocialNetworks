import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { NewsWidget } from '../components/NewsWidget';
import { PostCard } from '../components/PostCard';
import { StoriesBar } from '../components/StoriesBar';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadImage } from '../lib/media';
import {
  socialApi,
  type Post,
  type StoryGroup,
  type Visibility,
} from '../lib/social';

export function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadFeed() {
    setPosts(await socialApi.feed());
  }
  async function loadStories() {
    setStories(await socialApi.stories());
  }

  useEffect(() => {
    void loadFeed();
    void loadStories();
  }, []);

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await uploadImage(file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setPosting(true);
    setError(null);
    try {
      const post = await socialApi.createPost(
        text.trim(),
        image ?? undefined,
        visibility,
      );
      setPosts((prev) => [post, ...prev]);
      setText('');
      setImage(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  function onDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <TopBar />
      <div className="page">
        <NewsWidget />
        <main className="feed">
          <StoriesBar groups={stories} onChanged={loadStories} />

        <form className="composer" onSubmit={submitPost}>
          <div className="composer-row">
            <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} />
            <textarea
              placeholder={`¿Qué estás pensando, ${user?.displayName?.split(' ')[0]}?`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
          </div>
          {image && (
            <div className="composer-preview">
              <img src={mediaUrl(image)} alt="" />
              <button type="button" onClick={() => setImage(null)}>
                ✕
              </button>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <div className="composer-actions">
            <button
              type="button"
              className="composer-photo"
              onClick={() => fileRef.current?.click()}
            >
              📷 Foto
            </button>
            <select
              className="composer-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              title="¿Quién puede verlo?"
            >
              <option value="public">🌐 Público</option>
              <option value="friends">👥 Amigos</option>
              <option value="private">🔒 Solo yo</option>
            </select>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickImage}
            />
            <button
              type="submit"
              className="composer-submit"
              disabled={posting || (!text.trim() && !image)}
            >
              {posting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>

        {posts.length === 0 ? (
          <p className="feed-empty">
            Aún no hay publicaciones. ¡Sé el primero o agrega contactos!
          </p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              canDelete={p.author.id === user?.id}
              onDeleted={onDeleted}
              onShared={(np) => setPosts((prev) => [np, ...prev])}
            />
          ))
        )}
        </main>
      </div>
    </>
  );
}
