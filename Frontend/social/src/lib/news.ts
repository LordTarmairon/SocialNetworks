import { api } from './api';
import type { PublicUser } from './social';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'friend_request'
  | 'friend_accept'
  | 'mention'
  | 'photo_tag'
  | 'profile_view';

export interface Notification {
  id: string;
  type: NotificationType;
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

export interface Visitor extends PublicUser {
  visitedAt: string;
}

export const newsApi = {
  get: () => api.get<News>('/me/news'),
  markRead: () => api.post<{ ok: true }>('/me/news/read'),
  visitors: () => api.get<Visitor[]>('/me/news/visitors'),
};
