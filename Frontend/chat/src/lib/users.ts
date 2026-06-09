import { api } from './api';

export interface UserSettings {
  showReadReceipts: boolean;
  showLastSeen: boolean;
}

export const usersApi = {
  updateSettings: (settings: Partial<UserSettings>) =>
    api.patch<UserSettings>('/users/me/settings', settings),
};
