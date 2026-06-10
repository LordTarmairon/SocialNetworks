import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ConversationView } from '../chat/ConversationView';
import { GroupInfoModal } from '../chat/GroupInfoModal';
import { NewGroupModal } from '../chat/NewGroupModal';
import { useSocket } from '../chat/SocketContext';
import { Avatar } from '../components/Avatar';
import {
  chatApi,
  convAvatar,
  convName,
  type Conversation,
  type Message,
} from '../lib/chat';

export function ChatPage() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { id: selectedId } = useParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showGroup, setShowGroup] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const load = useCallback(async () => {
    setConversations(await chatApi.listConversations());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Mantener la lista al día cuando llegan mensajes nuevos o cambia la presencia.
  useEffect(() => {
    if (!socket) return;

    const onNew = (msg: Message) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
          // Conversación nueva (creada por el otro): recargamos la lista.
          void load();
          return prev;
        }
        const updated: Conversation = {
          ...prev[idx],
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
          },
          updatedAt: msg.createdAt,
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    };

    const onPresence = (e: {
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser?.id === e.userId
            ? { ...c, presence: { online: e.online, lastSeenAt: e.lastSeenAt } }
            : c,
        ),
      );
    };

    socket.on('message:new', onNew);
    socket.on('presence', onPresence);
    return () => {
      socket.off('message:new', onNew);
      socket.off('presence', onPresence);
    };
  }, [socket, load]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Palantír</div>
        <header className="sidebar-header">
          <div className="home-me">
            <Avatar name={user?.displayName ?? '?'} size={34} />
            <strong>{user?.displayName}</strong>
          </div>
          <div className="sidebar-actions">
            <button
              className="sidebar-link as-button"
              onClick={() => setShowGroup(true)}
              title="Crear grupo"
            >
              ＋ Grupo
            </button>
            <Link className="sidebar-link" to="/contacts">
              Contactos
            </Link>
            <Link className="sidebar-link" to="/settings">
              Ajustes
            </Link>
            <button className="home-logout" onClick={logout}>
              Salir
            </button>
          </div>
        </header>

        <ul className="conv-list">
          {conversations.length === 0 && (
            <li className="contacts-empty">
              No hay chats todavía. Ve a <Link to="/contacts">Contactos</Link>{' '}
              para empezar uno.
            </li>
          )}
          {conversations.map((c) => {
            const av = convAvatar(c);
            return (
              <li
                key={c.id}
                className={`conv-row ${c.id === selectedId ? 'active' : ''}`}
                onClick={() => navigate(`/c/${c.id}`)}
              >
                <Avatar name={av.name} src={av.src} />
                <div className="conv-info">
                  <span className="conv-name">
                    {c.isGroup && '👥 '}
                    {convName(c)}
                  </span>
                  <span className="conv-last">
                    {c.lastMessage?.content ?? 'Sin mensajes aún'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="chat-main">
        {selected && user ? (
          <ConversationView
            conversation={selected}
            meId={user.id}
            onOpenInfo={() => setShowInfo(true)}
          />
        ) : (
          <div className="chat-empty">
            <p>Selecciona un chat, crea un grupo o empieza uno desde Contactos 💬</p>
          </div>
        )}
      </section>

      {showGroup && (
        <NewGroupModal
          onClose={() => setShowGroup(false)}
          onCreated={(conv) => {
            setConversations((prev) => [conv, ...prev]);
            setShowGroup(false);
            navigate(`/c/${conv.id}`);
          }}
        />
      )}

      {showInfo && selected && selected.isGroup && (
        <GroupInfoModal
          conversation={selected}
          onClose={() => setShowInfo(false)}
          onUpdated={(conv) =>
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? conv : c)),
            )
          }
          onLeft={() => {
            setConversations((prev) => prev.filter((c) => c.id !== selected.id));
            setShowInfo(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
