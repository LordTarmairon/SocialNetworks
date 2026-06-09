import { api } from './api';
import type { PublicUser } from './friends';

export interface Conversation {
  id: string;
  otherUser: PublicUser | null;
  lastMessage: { content: string; createdAt: string } | null;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export const chatApi = {
  listConversations: () => api.get<Conversation[]>('/conversations'),

  startConversation: (userId: string) =>
    api.post<Conversation>('/conversations', { userId }),

  listMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),
};
