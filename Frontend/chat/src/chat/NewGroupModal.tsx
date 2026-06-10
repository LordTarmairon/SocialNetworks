import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { chatApi, type Conversation } from '../lib/chat';
import { errorMessage } from '../lib/errors';
import { friendsApi, type PublicUser } from '../lib/friends';

interface Props {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

export function NewGroupModal({ onClose, onCreated }: Props) {
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    friendsApi.listFriends().then(setFriends).catch(() => {});
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    if (!name.trim() || selected.size === 0) return;
    setCreating(true);
    setError(null);
    try {
      const conv = await chatApi.createGroup(name.trim(), [...selected]);
      onCreated(conv);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="group-overlay" onClick={onClose}>
      <div className="group-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Nuevo grupo</h2>
        {error && <div className="auth-error">{error}</div>}

        <input
          className="group-name"
          placeholder="Nombre del grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />

        <div className="group-members-label">
          Añade contactos ({selected.size})
        </div>
        <ul className="group-friends">
          {friends.length === 0 && (
            <li className="muted">No tienes contactos todavía.</li>
          )}
          {friends.map((f) => (
            <li
              key={f.id}
              className={`group-friend ${selected.has(f.id) ? 'on' : ''}`}
              onClick={() => toggle(f.id)}
            >
              <Avatar name={f.displayName} src={f.avatarUrl} size={34} />
              <span>{f.displayName}</span>
              <span className="group-check">
                {selected.has(f.id) ? '✓' : ''}
              </span>
            </li>
          ))}
        </ul>

        <div className="group-actions">
          <button className="group-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="group-create"
            onClick={create}
            disabled={creating || !name.trim() || selected.size === 0}
          >
            {creating ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}
