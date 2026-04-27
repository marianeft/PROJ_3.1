import { createContext, useContext, useState, ReactNode } from 'react';

const DEFAULT_CREDS = { username: 'admin', password: 'admin1234' };
const AUTH_KEY = 'em_admin_auth';
const CREDS_KEY = 'em_admin_credentials';

function getCredentials() {
  try {
    return JSON.parse(localStorage.getItem(CREDS_KEY) || JSON.stringify(DEFAULT_CREDS));
  } catch {
    return DEFAULT_CREDS;
  }
}

interface AuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  const login = (username: string, password: string): boolean => {
    const creds = getCredentials();
    if (username.trim() === creds.username && password === creds.password) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
