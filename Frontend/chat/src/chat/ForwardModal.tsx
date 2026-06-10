import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { chatApi, convAvatar, convName, type Conversation } from '../lib/chat';

interface Props {
  excludeId: string;
  onClose: () => void;
  onPick: (conv: Conversation) => void;
}

export function ForwardModal({ excludeId, onClose, onPick }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    chatApi.listConversations().then(setConversations).catch(() => {});
  }, []);

  return (
    <div className="group-overlay" onClick={onClose}>
      <div className="group-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Reenviar a…</h2>
        <ul className="group-friends">
          {conversations
            .filter((c) => c.id !== excludeId)
            .map((c) => {
              const av = convAvatar(c);
              return (
                <li
                  key={c.id}
                  className="group-friend"
                  onClick={() => onPick(c)}
                >
                  <Avatar name={av.name} src={av.src} size={34} />
                  <span>
                    {c.isGroup && '👥 '}
                    {convName(c)}
                  </span>
                </li>
              );
            })}
        </ul>
        <div className="group-actions">
          <button className="group-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
