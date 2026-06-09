import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import { chatApi, type Conversation, type Message } from '../lib/chat';
import { errorMessage } from '../lib/errors';
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
  const endRef = useRef<HTMLDivElement>(null);

  // Cargar historial al cambiar de conversación.
  useEffect(() => {
    let active = true;
    chatApi
      .listMessages(conversation.id)
      .then((m) => active && setMessages(m))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [conversation.id]);

  // Recibir mensajes en vivo.
  useEffect(() => {
    if (!socket) return;
    const onNew = (msg: Message) => {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    };
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [socket, conversation.id]);

  // Auto-scroll al final.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !socket) return;
    socket.emit('message:send', { conversationId: conversation.id, content });
    setText('');
  }

  const other = conversation.otherUser;

  return (
    <div className="thread">
      <header className="thread-header">
        <Avatar name={other?.displayName ?? '?'} src={other?.avatarUrl} size={40} />
        <div>
          <div className="thread-name">{other?.displayName ?? 'Chat'}</div>
          <div className="thread-username">@{other?.username}</div>
        </div>
      </header>

      <div className="thread-messages">
        {error && <div className="auth-error">{error}</div>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === meId ? 'mine' : 'theirs'}`}
          >
            <span className="bubble-text">{m.content}</span>
            <span className="bubble-time">
              {new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="thread-input" onSubmit={handleSend}>
        <input
          placeholder="Escribe un mensaje…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
