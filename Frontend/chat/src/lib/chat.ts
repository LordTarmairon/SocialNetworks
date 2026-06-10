import { api } from './api';
import type { PublicUser } from './friends';

export interface Presence {
  online: boolean;
  lastSeenAt: string | null;
}

export interface Conversation {
  id: string;
  otherUser: PublicUser | null;
  presence: Presence | null;
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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
  readAt: string | null;
  replyTo: ReplyRef | null;
  reactions: MessageReaction[];
}

export const chatApi = {
  listConversations: () => api.get<Conversation[]>('/conversations'),

  startConversation: (userId: string) =>
    api.post<Conversation>('/conversations', { userId }),

  listMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),
};
