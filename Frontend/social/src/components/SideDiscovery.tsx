import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { friendsApi, type Suggestion } from '../lib/friends';
import { mediaUrl } from '../lib/media';
import { socialApi, type PublicUser } from '../lib/social';
import { Avatar } from './Avatar';

type Photo = { id: string; imageUrl: string; author: PublicUser };

export function SideDiscovery() {
  const [online, setOnline] = useState<PublicUser[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    friendsApi.onlineFriends().then(setOnline).catch(() => {});
    friendsApi.suggestions().then(setSuggestions).catch(() => {});
    socialApi.discoverPhotos().then(setPhotos).catch(() => {});
  }, []);

  async function add(s: Suggestion) {
    try {
      await friendsApi.sendRequest(s.id);
      setAdded((prev) => new Set(prev).add(s.id));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="discovery">
      {/* Amigos conectados */}
      <section className="disc-card">
        <h3 className="disc-title">
          <span className="online-dot" /> Conectados ({online.length})
        </h3>
        {online.length === 0 ? (
          <p className="muted">Ningún contacto conectado ahora.</p>
        ) : (
          <ul className="disc-people">
            {online.map((u) => (
              <li key={u.id}>
                <Link to={`/u/${u.username}`}>
                  <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
                  <span>{u.displayName}</span>
                  <span className="online-dot small" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quizás conozcas */}
      {suggestions.length > 0 && (
        <section className="disc-card">
          <h3 className="disc-title">Quizás conozcas</h3>
          <ul className="disc-people">
            {suggestions.map((s) => (
              <li key={s.id} className="sugg-row">
                <Link to={`/u/${s.username}`} className="sugg-info">
                  <Avatar name={s.displayName} src={s.avatarUrl} size={34} />
                  <div>
                    <span className="sd-name">{s.displayName}</span>
                    <span className="sd-username">
                      {s.mutual} en común
                    </span>
                  </div>
                </Link>
                <button
                  className="btn-green sugg-add"
                  disabled={added.has(s.id)}
                  onClick={() => add(s)}
                >
                  {added.has(s.id) ? 'Enviada' : 'Agregar'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fotos que te pueden gustar */}
      {photos.length > 0 && (
        <section className="disc-card">
          <h3 className="disc-title">Fotos que te pueden gustar</h3>
          <div className="disc-photos">
            {photos.map((p) => (
              <Link key={p.id} to={`/u/${p.author.username}`} title={p.author.displayName}>
                <img src={mediaUrl(p.imageUrl)} alt="" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
