'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface UserContextType {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => void;
  deleteAccount: (userId: string, password: string) => Promise<boolean>;
  isLoaded: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user from localStorage once on mount
  useEffect(() => {
    try {
      const user = localStorage.getItem('fastget_currentUser');
      if (user) {
        setCurrentUser(JSON.parse(user));
      }
    } catch {
      localStorage.removeItem('fastget_currentUser');
    }
    setIsLoaded(true);
  }, []);

  const handleSetCurrentUser = useCallback((user: CurrentUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('fastget_currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('fastget_currentUser');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('fastget_currentUser');
  }, []);

  const handleDeleteAccount = useCallback(async (userId: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password }),
      });

      if (!response.ok) {
        console.error('Failed to delete account:', response.statusText);
        return false;
      }

      // Clear user from context and localStorage
      setCurrentUser(null);
      localStorage.removeItem('fastget_currentUser');
      
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        logout: handleLogout,
        deleteAccount: handleDeleteAccount,
        isLoaded,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
