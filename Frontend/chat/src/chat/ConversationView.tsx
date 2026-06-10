import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Avatar } from '../components/Avatar';
import {
  chatApi,
  convAvatar,
  convName,
  type Conversation,
  type Message,
  type MessageReaction,
} from '../lib/chat';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadImage } from '../lib/media';
import { presenceText } from '../lib/presence';
import { ForwardModal } from './ForwardModal';
import { useSocket } from './SocketContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  conversation: Conversation;
  meId: string;
  onOpenInfo?: () => void;
}

export function ConversationView({ conversation, meId, onOpenInfo }: Props) {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardFor, setForwardFor] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convId = conversation.id;

  useEffect(() => {
    let active = true;
    setOtherTyping(false);
    setReplyTo(null);
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

  useEffect(() => {
    if (!socket) return;

    const onNew = (msg: Message) => {
      if (msg.conversationId !== convId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
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

    const onReaction = (e: {
      messageId: string;
      reactions: MessageReaction[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === e.messageId ? { ...m, reactions: e.reactions } : m,
        ),
      );
    };

    const onUpdated = (msg: Message) => {
      if (msg.conversationId !== convId) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
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
        otherTypingTimeout.current = setTimeout(
          () => setOtherTyping(false),
          4000,
        );
      }
    };

    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    socket.on('message:reaction', onReaction);
    socket.on('message:updated', onUpdated);
    socket.on('typing', onTyping);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
      socket.off('message:reaction', onReaction);
      socket.off('message:updated', onUpdated);
      socket.off('typing', onTyping);
    };
  }, [socket, convId, meId]);

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
    socket.emit('message:send', {
      conversationId: convId,
      content,
      replyToId: replyTo?.id,
    });
    socket.emit('typing', { conversationId: convId, typing: false });
    setText('');
    setReplyTo(null);
  }

  async function handleAttach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !socket) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      socket.emit('message:send', {
        conversationId: convId,
        content: text.trim(),
        attachmentUrl: url,
        replyToId: replyTo?.id,
      });
      setText('');
      setReplyTo(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function react(m: Message, emoji: string) {
    if (!socket) return;
    const mine = m.reactions.find((r) => r.userId === meId);
    if (mine && mine.emoji === emoji) {
      socket.emit('message:unreact', { messageId: m.id });
    } else {
      socket.emit('message:react', { messageId: m.id, emoji });
    }
    setPickerFor(null);
  }

  function startEdit(m: Message) {
    setEditingId(m.id);
    setEditText(m.content);
  }

  function saveEdit() {
    if (!socket || !editingId) return;
    const c = editText.trim();
    if (c) socket.emit('message:edit', { messageId: editingId, content: c });
    setEditingId(null);
    setEditText('');
  }

  function deleteMsg(m: Message) {
    if (!socket) return;
    if (window.confirm('¿Borrar este mensaje para todos?')) {
      socket.emit('message:delete', { messageId: m.id });
    }
  }

  function forwardTo(target: Conversation) {
    if (!socket || !forwardFor) return;
    socket.emit('message:send', {
      conversationId: target.id,
      content: forwardFor.content,
      attachmentUrl: forwardFor.attachmentUrl ?? undefined,
      forwarded: true,
    });
    setForwardFor(null);
  }

  const other = conversation.otherUser;
  const statusText = otherTyping
    ? 'escribiendo…'
    : presenceText(conversation.presence);

  function reactionChips(m: Message) {
    if (m.reactions.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const r of m.reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    return (
      <div className="bubble-reactions">
        {Object.entries(counts).map(([emoji, n]) => (
          <span key={emoji} className="reaction-chip">
            {emoji} {n > 1 ? n : ''}
          </span>
        ))}
      </div>
    );
  }

  const av = convAvatar(conversation);
  const headerStatus = conversation.isGroup
    ? otherTyping
      ? 'escribiendo…'
      : `${conversation.members.length} miembros`
    : statusText || `@${other?.username}`;

  return (
    <div className="thread">
      <header
        className={`thread-header ${conversation.isGroup ? 'clickable' : ''}`}
        onClick={conversation.isGroup ? onOpenInfo : undefined}
      >
        <Avatar name={av.name} src={av.src} size={40} />
        <div>
          <div className="thread-name">{convName(conversation)}</div>
          <div className={`thread-status ${otherTyping ? 'typing' : ''}`}>
            {headerStatus}
            {conversation.isGroup && ' · ⓘ ver info'}
          </div>
        </div>
      </header>

      <div className="thread-messages">
        {error && <div className="auth-error">{error}</div>}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
              <div
                className={`bubble ${mine ? 'mine' : 'theirs'} ${
                  m.deleted ? 'deleted' : ''
                }`}
              >
                {conversation.isGroup && !mine && m.sender && (
                  <span className="bubble-sender">{m.sender.displayName}</span>
                )}

                {m.deleted ? (
                  <span className="bubble-text deleted-text">
                    🚫 Mensaje eliminado
                  </span>
                ) : editingId === m.id ? (
                  <form
                    className="bubble-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit();
                    }}
                  >
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="bubble-edit-actions">
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                      <button type="submit">Guardar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {m.forwarded && (
                      <span className="bubble-forwarded">↪ Reenviado</span>
                    )}
                    {m.replyTo && (
                      <div className="bubble-reply">
                        {m.replyTo.content ||
                          (m.replyTo.attachmentUrl ? '📷 Foto' : '')}
                      </div>
                    )}
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
                    {m.content && (
                      <span className="bubble-text">{m.content}</span>
                    )}
                    <span className="bubble-meta">
                      {m.editedAt && (
                        <span className="bubble-edited">editado</span>
                      )}
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
                  </>
                )}
                {!m.deleted && reactionChips(m)}
              </div>

              {!m.deleted && editingId !== m.id && (
                <div className="bubble-actions">
                  <button title="Responder" onClick={() => setReplyTo(m)}>
                    ↩
                  </button>
                  <button
                    title="Reaccionar"
                    onClick={() =>
                      setPickerFor((p) => (p === m.id ? null : m.id))
                    }
                  >
                    😀
                  </button>
                  <button title="Reenviar" onClick={() => setForwardFor(m)}>
                    ➡️
                  </button>
                  {mine && (
                    <button title="Editar" onClick={() => startEdit(m)}>
                      ✏️
                    </button>
                  )}
                  {mine && (
                    <button title="Borrar" onClick={() => deleteMsg(m)}>
                      🗑️
                    </button>
                  )}
                </div>
              )}

              {pickerFor === m.id && (
                <div className="msg-react-picker">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => react(m, e)}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-text">
            <strong>Respondiendo:</strong>{' '}
            {replyTo.content || (replyTo.attachmentUrl ? '📷 Foto' : '')}
          </div>
          <button onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

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

      {forwardFor && (
        <ForwardModal
          excludeId={conversation.id}
          onClose={() => setForwardFor(null)}
          onPick={forwardTo}
        />
      )}
    </div>
  );
}
