import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { disconnectSocket } from './socket';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  showPhonePublicly?: boolean;
  showEmailPublicly?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const STORAGE_KEY = 'petconnect_auth';
const EMPTY_STATE: AuthState = { user: null, accessToken: null };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): AuthState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_STATE);

  useEffect(() => {
    setState(readStoredAuth());
  }, []);

  function login(accessToken: string, user: AuthUser) {
    const next = { user, accessToken };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(EMPTY_STATE);
    disconnectSocket();
  }

  function updateUser(user: AuthUser) {
    setState((prev) => {
      const next = { ...prev, user };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <AuthContext.Provider
      value={{ ...state, isAuthenticated: !!state.accessToken, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
