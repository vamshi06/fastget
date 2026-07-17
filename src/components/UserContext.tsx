'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
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

  // On mount: paint instantly from localStorage, then reconcile against the
  // server session (the source of truth). localStorage has no expiry, so without
  // this step the UI can show a "logged-in" user whose session cookie has already
  // expired — and their orders would silently be saved unattributed.
  useEffect(() => {
    let cancelled = false;

    // 1. Optimistic paint from cached state.
    try {
      const user = localStorage.getItem('fastget_currentUser');
      if (user) {
        setCurrentUser(JSON.parse(user));
      }
    } catch {
      localStorage.removeItem('fastget_currentUser');
    }
    setIsLoaded(true);

    // 2. Reconcile with (and slide-refresh) the real session.
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            const u = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              phone: data.user.phone,
              role: data.user.role,
            };
            setCurrentUser(u);
            localStorage.setItem('fastget_currentUser', JSON.stringify(u));
          }
        } else if (res.status === 401) {
          // Session is gone/expired — drop the stale logged-in state.
          setCurrentUser(null);
          localStorage.removeItem('fastget_currentUser');
        }
      } catch {
        // Network/offline — keep the optimistic state rather than logging out.
      }
    })();

    return () => {
      cancelled = true;
    };
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
    // Clear the server session cookie too — otherwise the next /api/auth/me
    // reconcile would re-hydrate the user from the still-valid cookie.
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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
