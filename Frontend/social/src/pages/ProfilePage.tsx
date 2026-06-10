import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { EditProfile } from '../components/EditProfile';
import { PostCard } from '../components/PostCard';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import { friendsApi } from '../lib/friends';
import { socialApi, type Post, type Profile } from '../lib/social';

const relationLabel: Record<Profile['relation'], string> = {
  self: 'Este eres tú',
  friends: 'Sois contactos',
  pending_outgoing: 'Solicitud enviada',
  pending_incoming: 'Te ha agregado',
  none: 'No sois contactos',
};

export function ProfilePage() {
  const { username = '' } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [wallLocked, setWallLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setProfile(null);
    setPosts([]);
    setWallLocked(false);
    setError(null);

    socialApi
      .profile(username)
      .then(setProfile)
      .catch((err) => setError(errorMessage(err)));

    socialApi
      .wall(username)
      .then(setPosts)
      .catch(() => setWallLocked(true));
  }, [username]);

  if (error) {
    return (
      <>
        <TopBar />
        <main className="feed">
          <div className="auth-error">{error}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="feed">
        {profile && (
          <section className="profile-header">
            <Avatar
              name={profile.displayName}
              src={profile.avatarUrl}
              size={96}
            />
            <div className="profile-info">
              <h1>{profile.displayName}</h1>
              <p className="profile-username">@{profile.username}</p>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-stats">
                <span>
                  <strong>{profile.postCount}</strong> publicaciones
                </span>
                <span>
                  <strong>{profile.friendCount}</strong> contactos
                </span>
              </div>
              {profile.relation === 'self' ? (
                <button
                  className="btn-green profile-edit-btn"
                  onClick={() => setEditing(true)}
                >
                  Editar perfil
                </button>
              ) : (
                <div className="profile-actions">
                  <span className="profile-relation">
                    {relationLabel[profile.relation]}
                  </span>
                  <button
                    className="btn-ghost profile-block-btn"
                    onClick={async () => {
                      try {
                        if (profile.iBlocked) {
                          await friendsApi.unblock(profile.username);
                        } else {
                          if (
                            !window.confirm(
                              `¿Bloquear a ${profile.displayName}?`,
                            )
                          )
                            return;
                          await friendsApi.block(profile.username);
                        }
                        const p = await socialApi.profile(profile.username);
                        setProfile(p);
                        if (p.iBlocked) setPosts([]);
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}
                  >
                    {profile.iBlocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {editing && profile && (
          <EditProfile
            profile={profile}
            onSaved={(p) =>
              setProfile((prev) => (prev ? { ...prev, ...p } : prev))
            }
            onClose={() => setEditing(false)}
          />
        )}

        <div className="profile-links">
          <Link className="news-link" to={`/albumes/${username}`}>
            📷 Ver álbumes
          </Link>
        </div>

        <h2 className="wall-title">Muro</h2>
        {wallLocked ? (
          <p className="feed-empty">
            🔒 Solo los contactos pueden ver el muro de esta persona.
          </p>
        ) : posts.length === 0 ? (
          <p className="feed-empty">Sin publicaciones todavía.</p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              canDelete={p.author.id === user?.id}
              onDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))
        )}
      </main>
    </>
  );
}
