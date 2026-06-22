import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from persistence on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const persistedToken = await storage.getSecureItem(TOKEN_KEY);
        const persistedUser = await storage.getItem(USER_KEY);

        if (persistedToken && persistedUser) {
          setToken(persistedToken);
          setUser(JSON.parse(persistedUser));
        }
      } catch (e) {
        console.warn('Failed to load persisted authentication state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const handleAuthSuccess = async (newToken: string, newUser: User) => {
    await storage.setSecureItem(TOKEN_KEY, newToken);
    await storage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    await handleAuthSuccess(response.data.token, response.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    await handleAuthSuccess(response.data.token, response.data.user);
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await api.post('/auth/google', { idToken });
    await handleAuthSuccess(response.data.token, response.data.user);
  };

  const logout = async () => {
    await storage.deleteSecureItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
