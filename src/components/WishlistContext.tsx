'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/types';
import { useUser } from './UserContext';

const WISHLIST_STORAGE_KEY = 'fastget.wishlist.v1';

interface WishlistContextType {
  wishlistItems: Product[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  isLoaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Re-fetch whenever the logged-in user changes (including login/logout)
  useEffect(() => {
    if (!userIsLoaded) return;

    if (currentUser) {
      setIsLoaded(false);
      fetch(`/api/wishlist?userId=${currentUser.id}`)
        .then(res => res.json())
        .then(data => setWishlistItems(data.items ?? []))
        .catch(() => setWishlistItems([]))
        .finally(() => setIsLoaded(true));
    } else {
      // Guest — read from localStorage
      try {
        const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
        setWishlistItems(saved ? JSON.parse(saved) : []);
      } catch {
        setWishlistItems([]);
      }
      setIsLoaded(true);
    }
  }, [userIsLoaded, currentUser?.id]);

  // Persist guest wishlist to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded || currentUser) return;
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [wishlistItems, isLoaded, currentUser]);

  const addToWishlist = useCallback(async (product: Product) => {
    if (currentUser) {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          productId: product.id,
          productData: product,
        }),
      });
    }
    setWishlistItems(prev =>
      prev.some(p => p.id === product.id) ? prev : [product, ...prev]
    );
  }, [currentUser]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (currentUser) {
      await fetch(`/api/wishlist/${encodeURIComponent(productId)}?userId=${currentUser.id}`, {
        method: 'DELETE',
      });
    }
    setWishlistItems(prev => prev.filter(p => p.id !== productId));
  }, [currentUser]);

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
