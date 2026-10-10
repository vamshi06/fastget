'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { CartItem, Product } from '@/types';
import { useUser } from './UserContext';
import { track } from '@/lib/analytics';

interface CartState {
  items: CartItem[];
}

const CART_STORAGE_KEY = 'fastget.cart.v1';

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'REPLACE_CART'; payload: CartState }
  | { type: 'MERGE_SERVER_CART'; payload: { items: CartItem[] } }
  | { type: 'REFRESH_PRICES'; payload: { prices: Record<string, LivePrice> } }
  | { type: 'CLEAR_CART' };

/**
 * How a cart line is charged: `saleQty` units at the flash price, the rest at
 * the regular price. saleQty is 0 unless a flash sale is unlocked.
 */
export interface LineBreakdown {
  saleQty: number;
  saleUnit: number;
  regularQty: number;
  regularUnit: number;
  total: number;
}

/** Current catalog pricing for a product, as returned by GET /api/cart/prices. */
interface LivePrice {
  price: number;
  isFlashSale: boolean;
  saleOriginalPriceRupees?: number;
  saleMinOrderRupees?: number;
  moq?: number;
}

/**
 * Fewest units of a product that can be ordered. The cart never holds fewer:
 * adding starts at this many, and going below it removes the line. Mirrors
 * the server check in order-pricing.priceOrderFromCatalog.
 */
export function getMinOrderQty(product: Product): number {
  return product.moq && product.moq > 1 ? Math.floor(product.moq) : 1;
}

/** Product fields attached to cart/product analytics events. */
export function productProps(product: Product, quantity?: number) {
  return {
    product_id: product.id,
    product_name: product.name,
    category: product.categoryName || product.category,
    price: product.price,
    is_flash_sale: Boolean(product.isFlashSale),
    ...(quantity !== undefined && { quantity }),
  };
}

// Raises any line below its product's minimum up to that minimum - for carts
// restored from storage/the account, or saved before MOQ was enforced.
function clampToMinQty(items: CartItem[]): CartItem[] {
  let changed = false;
  const next = items.map(item => {
    const min = getMinOrderQty(item.product);
    if (item.quantity >= min) return item;
    changed = true;
    return { ...item, quantity: min };
  });
  return changed ? next : items;
}

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
      getLineTotal: (item: CartItem) => number;
      getLineBreakdown: (item: CartItem) => LineBreakdown;
      coinBalance: number;
      redeemCoins: boolean;
      setRedeemCoins: (value: boolean) => void;
      coinsToRedeem: number;
      setCoinsToRedeem: (value: number) => void;
    }
  | undefined
>(undefined);

/**
 * A flash-sale product's `price` is already the discounted sale price (set
 * at catalog-fetch time). This returns what it would cost WITHOUT the sale,
 * for the minimum-order check below - must stay in sync with the server's
 * originalPaise handling in order-pricing.priceOrderFromCatalog.
 */
export function getOriginalUnitPrice(product: Product): number {
  return product.isFlashSale && typeof product.saleOriginalPriceRupees === 'number'
    ? product.saleOriginalPriceRupees
    : product.price;
}

// Only this many units of a flash-sale item get the sale price per order -
// without a cap, a customer who unlocks the ₹1 price could buy 100 units at
// ₹1 each. Extra units can still be bought, at the regular price.
// Must stay in sync with order-pricing.FLASH_SALE_QTY_PER_ORDER (server pricing).
export const FLASH_SALE_QTY_PER_ORDER = 1;

// Most units of one product per order. Must stay in sync with
// order-pricing.MAX_QTY_PER_ITEM (the server rejects more).
export const MAX_QTY_PER_LINE = 1000;

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
          quantity: Math.min(MAX_QTY_PER_LINE, newItems[existingIndex].quantity + action.payload.quantity),
        };
        return { ...state, items: newItems };
      }

      // A new line starts at the product's minimum, whatever the caller asked
      // for (e.g. a card's "+" adds 1).
      return {
        ...state,
        items: [
          ...state.items,
          {
            product: action.payload.product,
            quantity: Math.min(MAX_QTY_PER_LINE, Math.max(action.payload.quantity, getMinOrderQty(action.payload.product))),
          },
        ],
      };
    }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload.productId),
      };
    
    case 'UPDATE_QUANTITY': {
      // Dropping below the minimum removes the line - it can't be ordered.
      const target = state.items.find(item => item.product.id === action.payload.productId);
      const min = target ? getMinOrderQty(target.product) : 1;
      if (action.payload.quantity < min) {
        return {
          ...state,
          items: state.items.filter(item => item.product.id !== action.payload.productId),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: Math.min(MAX_QTY_PER_LINE, action.payload.quantity) }
            : item
        ),
      };
    }

    case 'REPLACE_CART':
      return { ...action.payload, items: clampToMinQty(action.payload.items) };

    // Combines the cart saved on the account with whatever is already in this
    // browser's cart (e.g. items added before logging in), summing quantities
    // for products present in both rather than letting one side clobber the other.
    case 'MERGE_SERVER_CART': {
      const merged = [...state.items];
      for (const serverItem of action.payload.items) {
        const existingIndex = merged.findIndex(item => item.product.id === serverItem.product.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            quantity: merged[existingIndex].quantity + serverItem.quantity,
          };
        } else {
          merged.push(serverItem);
        }
      }
      return { ...state, items: clampToMinQty(merged) };
    }

    // Overwrites each item's stored price fields with the catalog's current
    // ones (see the refresh effect in CartProvider). Returns the same state
    // when nothing changed, so it doesn't trigger a re-save/re-render loop.
    case 'REFRESH_PRICES': {
      let changed = false;
      const items = state.items.map(item => {
        const live = action.payload.prices[item.product.id];
        if (!live) return item;
        const p = item.product;
        // Older servers don't send moq - keep the stored one in that case.
        const moq = typeof live.moq === 'number' ? live.moq : p.moq;
        if (
          p.price === live.price &&
          Boolean(p.isFlashSale) === live.isFlashSale &&
          p.saleOriginalPriceRupees === live.saleOriginalPriceRupees &&
          p.saleMinOrderRupees === live.saleMinOrderRupees &&
          p.moq === moq &&
          item.quantity >= getMinOrderQty(p)
        ) {
          return item;
        }
        changed = true;
        const product = {
          ...p,
          price: live.price,
          isFlashSale: live.isFlashSale || undefined,
          saleOriginalPriceRupees: live.saleOriginalPriceRupees,
          saleMinOrderRupees: live.saleMinOrderRupees,
          moq,
        };
        // The catalog's MOQ may be higher than when this was added.
        return { ...item, product, quantity: Math.max(item.quantity, getMinOrderQty(product)) };
      });
      return changed ? { ...state, items } : state;
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };
    
    default:
      return state;
  }
}

// Convenience fee has been removed - total equals subtotal.
// Must stay in sync with order-pricing.CONVENIENCE_FEE_PERCENTAGE (server pricing).
const CONVENIENCE_FEE_PERCENTAGE = 0;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  // Tracks which logged-in user's saved cart we've already fetched and merged
  // in, so it happens once per login rather than on every render/cart change.
  const mergedForUserIdRef = useRef<string | null>(null);

  // Coin redemption choice lives here (not on the cart/checkout pages) so it
  // carries over when a customer checks "Use coins" on the cart page and then
  // continues to checkout - they shouldn't have to make the same choice twice.
  const [coinBalance, setCoinBalance] = useState(0);
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setCoinBalance(0);
      setRedeemCoins(false);
      setCoinsToRedeem(0);
      return;
    }
    fetch('/api/coins/balance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.balance === 'number') setCoinBalance(data.balance);
      })
      .catch(() => {});
  }, [currentUser]);

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

  // On login, fetch this account's saved cart and merge it into whatever is
  // already in the browser (e.g. items added as a guest). Runs once per login
  // - mergedForUserIdRef guards against re-fetching on every render/cart change.
  useEffect(() => {
    if (!isLoaded || !userIsLoaded) return;

    if (!currentUser) {
      mergedForUserIdRef.current = null;
      return;
    }
    if (mergedForUserIdRef.current === currentUser.id) return;
    mergedForUserIdRef.current = currentUser.id;

    let cancelled = false;
    fetch('/api/cart', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        const serverItems: CartItem[] = Array.isArray(data.items) ? data.items : [];
        if (serverItems.length > 0) {
          dispatch({ type: 'MERGE_SERVER_CART', payload: { items: serverItems } });
        }
      })
      .catch(error => {
        console.warn('Failed to restore saved cart:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userIsLoaded, currentUser]);

  // Keep the account's saved cart in sync with local changes, once the
  // above merge has completed for this login (so we never overwrite the
  // saved cart with a pre-merge, guest-only snapshot).
  useEffect(() => {
    if (!isLoaded || !currentUser || mergedForUserIdRef.current !== currentUser.id) return;

    const timeout = setTimeout(() => {
      fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.items }),
      }).catch(error => {
        console.warn('Failed to save cart:', error);
      });
    }, 600);

    return () => clearTimeout(timeout);
  }, [isLoaded, currentUser, state]);

  // Refresh stored prices from the catalog whenever the set of products in
  // the cart changes (initial load, login merge, a new product added). Without
  // this, a cart keeps the price from when an item was added - so it can show
  // a price the checkout no longer charges.
  const cartIdsKey = state.items.map(item => item.product.id).sort().join(',');
  useEffect(() => {
    if (!isLoaded || !cartIdsKey) return;

    let cancelled = false;
    fetch(`/api/cart/prices?ids=${encodeURIComponent(cartIdsKey)}`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.prices) return;
        dispatch({ type: 'REFRESH_PRICES', payload: { prices: data.prices } });
      })
      .catch(error => {
        console.warn('Failed to refresh cart prices:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, cartIdsKey]);

  const addItem = useCallback((product: Product, quantity: number) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    track('added_to_cart', productProps(product, quantity));
  }, []);

  // Read through a ref so removeItem keeps a stable identity.
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  const removeItem = useCallback((productId: string) => {
    const line = itemsRef.current.find(item => item.product.id === productId);
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
    if (line) track('removed_from_cart', productProps(line.product, line.quantity));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
    setRedeemCoins(false);
    setCoinsToRedeem(0);
  }, []);

  const getItemCount = useCallback(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  // Cart subtotal at ORIGINAL (pre-discount) prices, optionally excluding one
  // product's own line (used for the flash-sale minimum-order check below -
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

  // The price this line actually charges - falls back to the original price
  // when the cart hasn't reached the flash sale's minimum order value yet.
  const getEffectiveUnitPrice = useCallback((product: Product) => {
    if (product.isFlashSale && !isFlashSaleEligible(product)) {
      return getOriginalUnitPrice(product);
    }
    return product.price;
  }, [isFlashSaleEligible]);

  // What a cart line actually charges: an unlocked flash sale prices only the
  // first FLASH_SALE_QTY_PER_ORDER units at the sale price, the rest at the
  // original price. Must stay in sync with order-pricing.priceOrderFromCatalog.
  const getLineBreakdown = useCallback((item: CartItem): LineBreakdown => {
    const unit = getEffectiveUnitPrice(item.product);
    const original = getOriginalUnitPrice(item.product);
    const saleQty = unit === original ? 0 : Math.min(item.quantity, FLASH_SALE_QTY_PER_ORDER);
    const regularQty = item.quantity - saleQty;
    return {
      saleQty,
      saleUnit: unit,
      regularQty,
      regularUnit: original,
      total: unit * saleQty + original * regularQty,
    };
  }, [getEffectiveUnitPrice]);

  const getLineTotal = useCallback((item: CartItem) => getLineBreakdown(item).total, [getLineBreakdown]);

  const getSubtotal = useCallback(() => {
    return state.items.reduce((sum, item) => sum + getLineTotal(item), 0);
  }, [state.items, getLineTotal]);

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
        getLineTotal,
        getLineBreakdown,
        coinBalance,
        redeemCoins,
        setRedeemCoins,
        coinsToRedeem,
        setCoinsToRedeem,
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
  getLineTotal: (item: CartItem) => item.product.price * item.quantity,
  getLineBreakdown: (item: CartItem): LineBreakdown => ({
    saleQty: 0,
    saleUnit: item.product.price,
    regularQty: item.quantity,
    regularUnit: item.product.price,
    total: item.product.price * item.quantity,
  }),
  coinBalance: 0,
  redeemCoins: false,
  setRedeemCoins: () => {},
  coinsToRedeem: 0,
  setCoinsToRedeem: () => {},
};

export function useCart() {
  const context = useContext(CartContext);
  // During SSR the context provider may not propagate correctly; fall back to
  // an empty-cart stub so components render consistently on server and client.
  return context ?? EMPTY_CART;
}
