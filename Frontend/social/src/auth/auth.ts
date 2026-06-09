import { api, clearToken, setToken } from '../lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<User> {
  const res = await api.post<AuthResponse>('/auth/register', input);
  setToken(res.accessToken);
  return res.user;
}

export async function login(
  identifier: string,
  password: string,
): Promise<User> {
  const res = await api.post<AuthResponse>('/auth/login', {
    identifier,
    password,
  });
  setToken(res.accessToken);
  return res.user;
}

export async function fetchMe(): Promise<User> {
  return api.get<User>('/auth/me');
}

export function logout(): void {
  clearToken();
}
