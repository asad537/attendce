import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isEmployee: boolean;
  isManager: boolean;
  isCeo: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify the saved session before rendering a protected route. Rendering the
  // cached user immediately can briefly send an already signed-in user to a
  // route that no longer matches their current server-side role/session.
  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          // Validate the JSON first, then use the server as the source of truth
          // before a route is chosen.
          JSON.parse(storedUser);
          setToken(storedToken);
          const fresh = await authService.me();

          if (mounted) {
            setUser(fresh);
            localStorage.setItem('auth_user', JSON.stringify(fresh));
          }
        } catch {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          if (mounted) {
            setToken(null);
            setUser(null);
          }
        }
      }

      if (mounted) setIsLoading(false);
    };

    void hydrateSession();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login(email, password);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authService.me();
      setUser(fresh);
      localStorage.setItem('auth_user', JSON.stringify(fresh));
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      refreshUser,
      isEmployee: user?.role === 'employee',
      isManager:  user?.role === 'manager',
      isCeo:      user?.role === 'ceo',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
