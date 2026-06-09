import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getToken } from '../lib/api';
import { usersApi } from '../lib/users';
import {
  fetchMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  type RegisterInput,
  type User,
} from './auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateSettings: (settings: {
    showReadReceipts?: boolean;
    showLastSeen?: boolean;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si hay token guardado intentamos recuperar el usuario.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => logoutApi())
      .finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login: async (identifier, password) => {
      setUser(await loginApi(identifier, password));
    },
    register: async (input) => {
      setUser(await registerApi(input));
    },
    logout: () => {
      logoutApi();
      setUser(null);
    },
    updateSettings: async (settings) => {
      const updated = await usersApi.updateSettings(settings);
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
