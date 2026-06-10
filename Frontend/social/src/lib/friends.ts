import { api } from './api';
import type { PublicUser } from './social';

export type RelationStatus =
  | 'none'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming';

export interface SearchResult extends PublicUser {
  relation: RelationStatus;
}

export interface FriendRequest {
  requestId: string;
  user: PublicUser;
  createdAt: string;
}

export interface Suggestion extends PublicUser {
  mutual: number;
}

export const friendsApi = {
  search: (q: string) =>
    api.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`),
  listFriends: () => api.get<PublicUser[]>('/friends'),
  onlineFriends: () => api.get<PublicUser[]>('/friends/online'),
  suggestions: () => api.get<Suggestion[]>('/friends/suggestions'),
  listRequests: () => api.get<FriendRequest[]>('/friends/requests'),
  sendRequest: (addresseeId: string) =>
    api.post<{ ok: true }>('/friends/requests', { addresseeId }),
  accept: (requestId: string) =>
    api.post<{ ok: true }>(`/friends/requests/${requestId}/accept`),
  reject: (requestId: string) =>
    api.del<{ ok: true }>(`/friends/requests/${requestId}`),
  block: (username: string) =>
    api.post<{ ok: true }>(`/users/${username}/block`),
  unblock: (username: string) =>
    api.del<{ ok: true }>(`/users/${username}/block`),
  listBlocked: () => api.get<PublicUser[]>('/me/blocked'),
  follow: (username: string) =>
    api.post<{ ok: true }>(`/users/${username}/follow`),
  unfollow: (username: string) =>
    api.del<{ ok: true }>(`/users/${username}/follow`),
};
