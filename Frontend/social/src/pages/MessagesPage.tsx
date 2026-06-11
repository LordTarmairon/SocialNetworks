import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { TopBar } from '../components/TopBar';
import { getToken } from '../lib/api';
import { chatApi, convName, type Conversation, type Message } from '../lib/chat';
import { connectSocket } from '../lib/socket';

export function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Refresca solo la lista de conversaciones (lo usa el tiempo real).
  const load = useCallback(async () => {
    setConversations(await chatApi.listConversations());
  }, []);

  // Al montar: carga la lista y, si viene ?to=userId, abre/crea esa conversación.
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await chatApi.listConversations();
      if (!active) return;
      setConversations(list);
      const to = new URLSearchParams(window.location.search).get('to');
      if (to) {
        try {
          const conv = await chatApi.startConversation(to);
          if (!active) return;
          setConversations((prev) =>
            prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev],
          );
          setActiveId(conv.id);
          window.history.replaceState({}, '', '/mensajes');
          return;
        } catch {
          if (!active) return;
          setError('Solo puedes escribir a tus contactos.');
          window.history.replaceState({}, '', '/mensajes');
        }
      }
      setActiveId((cur) => cur ?? list[0]?.id ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Mensajes de la conversación activa + marcar leídos.
  useEffect(() => {
    if (!activeId) return;
    let active = true;
    chatApi.listMessages(activeId).then((m) => {
      if (active) setMessages(m);
    });
    const token = getToken();
    if (token) connectSocket(token).emit('message:read', { conversationId: activeId });
    return () => {
      active = false;
    };
  }, [activeId]);

  // Tiempo real: mensajes nuevos y presencia.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = connectSocket(token);

    const onNew = (msg: Message) => {
      if (msg.conversationId === activeId) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('message:read', { conversationId: activeId });
      }
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
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
        return [updated, ...prev.filter((_, i) => i !== idx)];
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
  }, [activeId, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId) return;
    const token = getToken();
    if (!token) return;
    connectSocket(token).emit('message:send', { conversationId: activeId, content });
    setText('');
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <>
      <TopBar />
      <div className={`msg-page ${activeId ? 'show-thread' : ''}`}>
        <aside className="msg-list">
          <h2 className="msg-list-title">Mensajes</h2>
          {error && <p className="msg-warn">{error}</p>}
          {conversations.length === 0 ? (
            <p className="msg-empty">
              No tienes conversaciones. Entra en un perfil y pulsa «Mensaje».
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                className={`msg-row ${c.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(c.id)}
              >
                <Avatar
                  name={convName(c)}
                  src={c.isGroup ? c.imageUrl : c.otherUser?.avatarUrl}
                  size={44}
                />
                <div className="msg-row-info">
                  <span className="msg-row-name">
                    {c.isGroup && '👥 '}
                    {convName(c)}
                    {c.presence?.online && <span className="msg-online" />}
                  </span>
                  <span className="msg-row-last">
                    {c.lastMessage?.content ?? 'Sin mensajes aún'}
                  </span>
                </div>
              </button>
            ))
          )}
        </aside>

        <section className="msg-thread">
          {active ? (
            <>
              <header className="msg-thread-head">
                <button
                  className="msg-back"
                  onClick={() => setActiveId(null)}
                  aria-label="Volver"
                >
                  ‹
                </button>
                <Avatar
                  name={convName(active)}
                  src={active.isGroup ? active.imageUrl : active.otherUser?.avatarUrl}
                  size={36}
                />
                <div>
                  <div className="msg-thread-name">{convName(active)}</div>
                  {active.presence?.online && (
                    <div className="msg-thread-status">En línea</div>
                  )}
                </div>
              </header>
              <div className="msg-thread-body">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`msg-bubble ${m.senderId === user?.id ? 'mine' : 'theirs'}`}
                  >
                    {m.deleted ? (
                      <em className="msg-deleted">Mensaje eliminado</em>
                    ) : (
                      m.content
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form className="msg-input" onSubmit={send}>
                <input
                  placeholder="Escribe un mensaje…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" disabled={!text.trim()}>
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="msg-thread-empty">
              Selecciona una conversación 💬
            </div>
          )}
        </section>
      </div>
    </>
  );
}
