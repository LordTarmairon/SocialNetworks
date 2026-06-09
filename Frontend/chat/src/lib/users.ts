import { api } from './api';

export interface UserSettings {
  showReadReceipts: boolean;
  showLastSeen: boolean;
}

export interface ProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export const usersApi = {
  updateSettings: (settings: Partial<UserSettings>) =>
    api.patch<UserSettings>('/users/me/settings', settings),

  updateProfile: (data: ProfileUpdate) =>
    api.patch<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
    }>('/users/me/profile', data),
};
