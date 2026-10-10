'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Product } from '@/types';
import { useUser } from './UserContext';

const WISHLIST_STORAGE_KEY = 'fastget.wishlist.v1';
const GUEST = 'guest';

interface WishlistContextType {
  wishlistItems: Product[];
  /** Resolves false if the save failed; the change is rolled back. */
  addToWishlist: (product: Product) => Promise<boolean>;
  /** Resolves false if the removal failed; the change is rolled back. */
  removeFromWishlist: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  isLoaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function readGuestWishlist(): Product[] {
  try {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function clearGuestWishlist() {
  try {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  } catch {
    // storage unavailable - ignore
  }
}

// The API caps product data at 4 KB: drop the variant list and long text,
// which the wishlist page doesn't need.
function toSnapshot(product: Product): Product {
  const { variants: _variants, ...rest } = product as Product & { variants?: unknown };
  return { ...rest, description: (rest.description ?? '').slice(0, 500) };
}

async function saveToServer(product: Product): Promise<boolean> {
  try {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, productData: toSnapshot(product) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteFromServer(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // Mirrors wishlistItems so actions can read the latest list synchronously.
  const itemsRef = useRef<Product[]>([]);
  // Whose list is loaded (GUEST or a user id). Only a guest list is ever
  // written to localStorage, so an account's list never leaks into it.
  const ownerRef = useRef<string | null>(null);

  const setItems = useCallback((next: Product[]) => {
    itemsRef.current = next;
    setWishlistItems(next);
    if (ownerRef.current === GUEST) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full or unavailable - ignore
      }
    }
  }, []);

  // Re-fetch whenever the logged-in user changes (including login/logout)
  useEffect(() => {
    if (!userIsLoaded) return;

    if (currentUser) {
      const userId = currentUser.id;
      let cancelled = false;
      ownerRef.current = null;
      setIsLoaded(false);

      (async () => {
        // Anything saved as a guest before logging in moves into the account.
        const guestItems = readGuestWishlist();
        let serverItems: Product[] = [];
        try {
          const res = await fetch('/api/wishlist');
          const data = await res.json();
          serverItems = data.items ?? [];
        } catch {
          // fall through with an empty server list
        }

        const toMerge = guestItems.filter(g => !serverItems.some(s => s.id === g.id));
        const results = await Promise.all(toMerge.map(saveToServer));
        const merged = toMerge.filter((_, i) => results[i]);
        // Clear only once every guest item is safely in the account; otherwise
        // the next load retries the rest.
        if (results.every(Boolean)) clearGuestWishlist();

        if (cancelled) return;
        ownerRef.current = userId;
        setItems([...merged, ...serverItems]);
        setIsLoaded(true);
      })();

      return () => { cancelled = true; };
    }

    ownerRef.current = GUEST;
    setItems(readGuestWishlist());
    setIsLoaded(true);
  }, [userIsLoaded, currentUser?.id, setItems]);

  // Both actions update the UI immediately and undo it if the server refuses.
  const addToWishlist = useCallback(async (product: Product) => {
    if (itemsRef.current.some(p => p.id === product.id)) return true;
    setItems([product, ...itemsRef.current]);
    if (!currentUser) return true;

    const ok = await saveToServer(product);
    if (!ok) setItems(itemsRef.current.filter(p => p.id !== product.id));
    return ok;
  }, [currentUser, setItems]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    const index = itemsRef.current.findIndex(p => p.id === productId);
    if (index === -1) return true;
    const removed = itemsRef.current[index];
    setItems(itemsRef.current.filter(p => p.id !== productId));
    if (!currentUser) return true;

    const ok = await deleteFromServer(productId);
    if (!ok && !itemsRef.current.some(p => p.id === productId)) {
      const next = [...itemsRef.current];
      next.splice(Math.min(index, next.length), 0, removed);
      setItems(next);
    }
    return ok;
  }, [currentUser, setItems]);

  const isInWishlist = useCallback((productId: string) => {
    return wishlistItems.some(p => p.id === productId);
  }, [wishlistItems]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        wishlistCount: wishlistItems.length,
        isLoaded,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
