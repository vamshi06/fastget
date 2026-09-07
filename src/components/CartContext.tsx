'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
}

const CART_STORAGE_KEY = 'fastget.cart.v1';

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'REPLACE_CART'; payload: CartState }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<
  | {
      state: CartState;
      addItem: (product: Product, quantity: number) => void;
      removeItem: (productId: string) => void;
      updateQuantity: (productId: string, quantity: number) => void;
      clearCart: () => void;
      isLoaded: boolean;
      getItemCount: () => number;
      getSubtotal: () => number;
      getConvenienceFee: () => number;
      getTotal: () => number;
      getPreDiscountSubtotal: (excludeProductId?: string) => number;
      isFlashSaleEligible: (product: Product) => boolean;
      getEffectiveUnitPrice: (product: Product) => number;
    }
  | undefined
>(undefined);

/**
 * A flash-sale product's `price` is already the discounted sale price (set
 * at catalog-fetch time). This returns what it would cost WITHOUT the sale,
 * for the minimum-order check below — must stay in sync with the server's
 * originalPaise handling in order-pricing.priceOrderFromCatalog.
 */
function getOriginalUnitPrice(product: Product): number {
  return product.isFlashSale && typeof product.saleOriginalPriceRupees === 'number'
    ? product.saleOriginalPriceRupees
    : product.price;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item => item.product.id === action.payload.product.id
      );
      
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + action.payload.quantity,
        };
        return { ...state, items: newItems };
      }
      
      return {
        ...state,
        items: [
          ...state.items,
          { product: action.payload.product, quantity: action.payload.quantity },
        ],
      };
    }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload.productId),
      };
    
    case 'UPDATE_QUANTITY':
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.product.id !== action.payload.productId),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    
    case 'REPLACE_CART':
      return action.payload;
    
    case 'CLEAR_CART':
      return { ...state, items: [] };
    
    default:
      return state;
  }
}

// Convenience fee has been removed — total equals subtotal.
// Must stay in sync with order-pricing.CONVENIENCE_FEE_PERCENTAGE (server pricing).
const CONVENIENCE_FEE_PERCENTAGE = 0;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartState;
        if (Array.isArray(parsed.items)) {
          dispatch({ type: 'REPLACE_CART', payload: parsed });
        }
      }
    } catch (error) {
      console.warn('Failed to restore cart from localStorage:', error);
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
    
    setTimeout(() => setIsLoaded(true), 0);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }, [isLoaded, state]);

  const addItem = useCallback((product: Product, quantity: number) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const getItemCount = useCallback(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  // Cart subtotal at ORIGINAL (pre-discount) prices, optionally excluding one
  // product's own line (used for the flash-sale minimum-order check below —
  // "min order ₹100" means ₹100 of OTHER products, not counting the sale
  // item's own price). Must stay in sync with order-pricing.priceOrderFromCatalog.
  const getPreDiscountSubtotal = useCallback((excludeProductId?: string) => {
    return state.items.reduce((sum, item) => {
      if (excludeProductId && item.product.id === excludeProductId) return sum;
      return sum + getOriginalUnitPrice(item.product) * item.quantity;
    }, 0);
  }, [state.items]);

  const isFlashSaleEligible = useCallback((product: Product) => {
    if (!product.isFlashSale) return true;
    if (typeof product.saleMinOrderRupees !== 'number') return true;
    return getPreDiscountSubtotal(product.id) >= product.saleMinOrderRupees;
  }, [getPreDiscountSubtotal]);

  // The price this line actually charges — falls back to the original price
  // when the cart hasn't reached the flash sale's minimum order value yet.
  const getEffectiveUnitPrice = useCallback((product: Product) => {
    if (product.isFlashSale && !isFlashSaleEligible(product)) {
      return getOriginalUnitPrice(product);
    }
    return product.price;
  }, [isFlashSaleEligible]);

  const getSubtotal = useCallback(() => {
    return state.items.reduce(
      (sum, item) => sum + getEffectiveUnitPrice(item.product) * item.quantity,
      0
    );
  }, [state.items, getEffectiveUnitPrice]);

  const getConvenienceFee = useCallback(() => {
    const subtotal = getSubtotal();
    return Math.round(subtotal * (CONVENIENCE_FEE_PERCENTAGE / 100));
  }, [getSubtotal]);

  const getTotal = useCallback(() => {
    return getSubtotal() + getConvenienceFee();
  }, [getSubtotal, getConvenienceFee]);

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isLoaded,
        getItemCount,
        getSubtotal,
        getConvenienceFee,
        getTotal,
        getPreDiscountSubtotal,
        isFlashSaleEligible,
        getEffectiveUnitPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const EMPTY_CART = {
  state: { items: [] as import('@/types').CartItem[] },
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  isLoaded: false,
  getItemCount: () => 0,
  getSubtotal: () => 0,
  getConvenienceFee: () => 0,
  getTotal: () => 0,
  getPreDiscountSubtotal: () => 0,
  isFlashSaleEligible: () => true,
  getEffectiveUnitPrice: (product: Product) => product.price,
};

export function useCart() {
  const context = useContext(CartContext);
  // During SSR the context provider may not propagate correctly; fall back to
  // an empty-cart stub so components render consistently on server and client.
  return context ?? EMPTY_CART;
}
