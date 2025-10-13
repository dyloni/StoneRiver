import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AdminRole } from '../types';
import { supabase } from '../utils/supabase';

interface AuthUser {
  id: number;
  firstName: string;
  surname: string;
  email?: string;
  profilePictureUrl?: string;
  type: 'agent' | 'admin';
  role?: AdminRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('stoneriver_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('Restored user from localStorage:', parsedUser);
        }
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('stoneriver_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (loggedInUser: AuthUser, rememberMe: boolean = false) => {
    setUser(loggedInUser);

    if (rememberMe) {
      localStorage.setItem('stoneriver_user', JSON.stringify(loggedInUser));
    } else {
      sessionStorage.setItem('stoneriver_user', JSON.stringify(loggedInUser));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stoneriver_user');
    sessionStorage.removeItem('stoneriver_user');
  };

  const updateUser = (updatedData: Partial<AuthUser>) => {
    setUser(prevUser => {
      if (!prevUser) return null;

      const updated = { ...prevUser, ...updatedData };

      const storedInLocal = localStorage.getItem('stoneriver_user');
      const storedInSession = sessionStorage.getItem('stoneriver_user');

      if (storedInLocal) {
        localStorage.setItem('stoneriver_user', JSON.stringify(updated));
      } else if (storedInSession) {
        sessionStorage.setItem('stoneriver_user', JSON.stringify(updated));
      }

      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
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