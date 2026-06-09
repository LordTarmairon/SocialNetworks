import { api } from './api';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

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

export const friendsApi = {
  search: (q: string) =>
    api.get<SearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`),

  listFriends: () => api.get<PublicUser[]>('/friends'),

  listRequests: () => api.get<FriendRequest[]>('/friends/requests'),

  sendRequest: (addresseeId: string) =>
    api.post<{ ok: true }>('/friends/requests', { addresseeId }),

  accept: (requestId: string) =>
    api.post<{ ok: true }>(`/friends/requests/${requestId}/accept`, {}),
};
