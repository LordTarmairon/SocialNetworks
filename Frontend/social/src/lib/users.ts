import { api } from './api';

export interface ProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

export const usersApi = {
  updateProfile: (data: ProfileUpdate) =>
    api.patch<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      coverUrl: string | null;
      bio: string | null;
    }>('/users/me/profile', data),
};
