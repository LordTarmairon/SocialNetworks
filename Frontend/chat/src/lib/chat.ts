import { api } from './api';
import type { PublicUser } from './friends';

export interface Presence {
  online: boolean;
  lastSeenAt: string | null;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  imageUrl: string | null;
  otherUser: PublicUser | null;
  presence: Presence | null;
  members: PublicUser[];
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  updatedAt: string;
}

export interface ReplyRef {
  id: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface MessageSender {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: MessageSender | null;
  content: string;
  attachmentUrl: string | null;
  deleted: boolean;
  editedAt: string | null;
  forwarded: boolean;
  createdAt: string;
  readAt: string | null;
  replyTo: ReplyRef | null;
  reactions: MessageReaction[];
}

/** Nombre a mostrar de una conversación (grupo o 1-a-1). */
export function convName(c: Conversation): string {
  if (c.isGroup) return c.name ?? 'Grupo';
  return c.otherUser?.displayName ?? 'Chat';
}

/** Avatar (nombre + imagen) de una conversación. */
export function convAvatar(c: Conversation): {
  name: string;
  src?: string | null;
} {
  if (c.isGroup) return { name: c.name ?? 'G', src: c.imageUrl };
  return { name: c.otherUser?.displayName ?? '?', src: c.otherUser?.avatarUrl };
}

export const chatApi = {
  listConversations: () => api.get<Conversation[]>('/conversations'),

  startConversation: (userId: string) =>
    api.post<Conversation>('/conversations', { userId }),

  createGroup: (name: string, memberIds: string[]) =>
    api.post<Conversation>('/conversations/group', { name, memberIds }),

  leaveGroup: (conversationId: string) =>
    api.post<{ ok: true }>(`/conversations/${conversationId}/leave`, {}),

  addMembers: (conversationId: string, memberIds: string[]) =>
    api.post<Conversation>(`/conversations/${conversationId}/members`, {
      memberIds,
    }),

  renameGroup: (conversationId: string, name: string) =>
    api.patch<Conversation>(`/conversations/${conversationId}`, { name }),

  listMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),
};
