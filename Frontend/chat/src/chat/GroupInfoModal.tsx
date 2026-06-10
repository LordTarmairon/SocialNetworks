import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { chatApi, type Conversation } from '../lib/chat';
import { errorMessage } from '../lib/errors';
import { friendsApi, type PublicUser } from '../lib/friends';

interface Props {
  conversation: Conversation;
  onClose: () => void;
  onUpdated: (conv: Conversation) => void;
  onLeft: () => void;
}

export function GroupInfoModal({
  conversation,
  onClose,
  onUpdated,
  onLeft,
}: Props) {
  const [name, setName] = useState(conversation.name ?? '');
  const [members, setMembers] = useState<PublicUser[]>(conversation.members);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    friendsApi.listFriends().then(setFriends).catch(() => {});
  }, []);

  const memberIds = new Set(members.map((m) => m.id));
  const addable = friends.filter((f) => !memberIds.has(f.id));

  async function rename() {
    if (!name.trim() || name.trim() === conversation.name) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await chatApi.renameGroup(conversation.id, name.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function add(f: PublicUser) {
    setError(null);
    try {
      const conv = await chatApi.addMembers(conversation.id, [f.id]);
      setMembers(conv.members);
      onUpdated(conv);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function leave() {
    if (!window.confirm('¿Salir del grupo?')) return;
    try {
      await chatApi.leaveGroup(conversation.id);
      onLeft();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="group-overlay" onClick={onClose}>
      <div className="group-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Información del grupo</h2>
        {error && <div className="auth-error">{error}</div>}

        <div className="group-rename">
          <input
            className="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <button className="group-create" onClick={rename} disabled={busy}>
            Renombrar
          </button>
        </div>

        <div className="group-members-label">Miembros ({members.length})</div>
        <ul className="group-friends">
          {members.map((m) => (
            <li key={m.id} className="group-friend">
              <Avatar name={m.displayName} src={m.avatarUrl} size={34} />
              <span>{m.displayName}</span>
            </li>
          ))}
        </ul>

        {addable.length > 0 && (
          <>
            <div className="group-members-label">Añadir contactos</div>
            <ul className="group-friends">
              {addable.map((f) => (
                <li key={f.id} className="group-friend" onClick={() => add(f)}>
                  <Avatar name={f.displayName} src={f.avatarUrl} size={34} />
                  <span>{f.displayName}</span>
                  <span className="group-check">＋</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="group-actions">
          <button className="group-leave" onClick={leave}>
            Salir del grupo
          </button>
          <button className="group-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
