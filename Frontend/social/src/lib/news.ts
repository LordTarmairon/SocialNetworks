import { api } from './api';
import type { PublicUser } from './social';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accept';
  actor: PublicUser;
  postId: string | null;
  read: boolean;
  createdAt: string;
}

export interface News {
  profileVisits: number;
  recentVisitors: PublicUser[];
  friendRequests: number;
  friendCount: number;
  milestone: number | null;
  newUsers: (PublicUser & { joinedAt: string })[];
  notifications: Notification[];
  unread: number;
}

export const newsApi = {
  get: () => api.get<News>('/me/news'),
  markRead: () => api.post<{ ok: true }>('/me/news/read'),
};
