import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Avatar } from '../components/Avatar';
import { chatApi, type Conversation, type Message } from '../lib/chat';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadImage } from '../lib/media';
import { presenceText } from '../lib/presence';
import { useSocket } from './SocketContext';

interface Props {
  conversation: Conversation;
  meId: string;
}

export function ConversationView({ conversation, meId }: Props) {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convId = conversation.id;

  // Cargar historial y marcar como leído al abrir.
  useEffect(() => {
    let active = true;
    setOtherTyping(false);
    chatApi
      .listMessages(convId)
      .then((m) => {
        if (!active) return;
        setMessages(m);
        socket?.emit('message:read', { conversationId: convId });
      })
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [convId, socket]);

  // Eventos en vivo.
  useEffect(() => {
    if (!socket) return;

    const onNew = (msg: Message) => {
      if (msg.conversationId !== convId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      // Si lo recibimos del otro y estamos viendo el chat, lo marcamos leído.
      if (msg.senderId !== meId) {
        socket.emit('message:read', { conversationId: convId });
      }
    };

    const onRead = (e: { conversationId: string; readAt: string }) => {
      if (e.conversationId !== convId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === meId && !m.readAt ? { ...m, readAt: e.readAt } : m,
        ),
      );
    };

    const onTyping = (e: {
      conversationId: string;
      userId: string;
      typing: boolean;
    }) => {
      if (e.conversationId !== convId || e.userId === meId) return;
      setOtherTyping(e.typing);
      if (otherTypingTimeout.current) clearTimeout(otherTypingTimeout.current);
      if (e.typing) {
        // Por seguridad, lo ocultamos solo si dejan de llegar eventos.
        otherTypingTimeout.current = setTimeout(
          () => setOtherTyping(false),
          4000,
        );
      }
    };

    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    socket.on('typing', onTyping);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
      socket.off('typing', onTyping);
    };
  }, [socket, convId, meId]);

  // Auto-scroll al final.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  function handleInput(value: string) {
    setText(value);
    if (!socket) return;
    socket.emit('typing', { conversationId: convId, typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { conversationId: convId, typing: false });
    }, 1500);
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !socket) return;
    socket.emit('message:send', { conversationId: convId, content });
    socket.emit('typing', { conversationId: convId, typing: false });
    setText('');
  }

  async function handleAttach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !socket) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      // Enviamos la imagen, usando el texto actual como pie de foto (opcional).
      socket.emit('message:send', {
        conversationId: convId,
        content: text.trim(),
        attachmentUrl: url,
      });
      setText('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const other = conversation.otherUser;
  const statusText = otherTyping
    ? 'escribiendo…'
    : presenceText(conversation.presence);

  return (
    <div className="thread">
      <header className="thread-header">
        <Avatar name={other?.displayName ?? '?'} src={other?.avatarUrl} size={40} />
        <div>
          <div className="thread-name">{other?.displayName ?? 'Chat'}</div>
          <div className={`thread-status ${otherTyping ? 'typing' : ''}`}>
            {statusText || `@${other?.username}`}
          </div>
        </div>
      </header>

      <div className="thread-messages">
        {error && <div className="auth-error">{error}</div>}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : 'theirs'}`}>
              {m.attachmentUrl && (
                <a
                  href={mediaUrl(m.attachmentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="bubble-image"
                >
                  <img src={mediaUrl(m.attachmentUrl)} alt="adjunto" />
                </a>
              )}
              {m.content && <span className="bubble-text">{m.content}</span>}
              <span className="bubble-meta">
                <span className="bubble-time">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {mine && (
                  <span
                    className={`bubble-check ${m.readAt ? 'read' : ''}`}
                    title={m.readAt ? 'Visto' : 'Enviado'}
                  >
                    {m.readAt ? '✓✓' : '✓'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="thread-input" onSubmit={handleSend}>
        <button
          type="button"
          className="attach-btn"
          title="Adjuntar imagen o GIF"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? '…' : '📎'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAttach}
        />
        <input
          placeholder="Escribe un mensaje…"
          value={text}
          onChange={(e) => handleInput(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
