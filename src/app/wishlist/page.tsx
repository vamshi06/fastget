'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, ArrowRight, Trash2, LogIn } from 'lucide-react';
import { useWishlist } from '@/components/WishlistContext';
import { useCart } from '@/components/CartContext';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ToastContext';
import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types';

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, wishlistCount, isLoaded } = useWishlist();
  const { addItem } = useCart();
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  const { showToast } = useToast();
  const router = useRouter();

  const handleAddAllToCart = () => {
    wishlistItems.forEach(product => {
      if (product.stockStatus !== 'out') {
        addItem(product, 1);
      }
    });
    showToast('All available items added to cart', 'success', {
      label: 'View Cart',
      href: '/cart',
    });
  };

  const handleRemove = async (product: Product) => {
    await removeFromWishlist(product.id);
    showToast(`${product.name} removed from wishlist`, 'success');
  };

  return (
    <div className="min-h-screen bg-brand-fog py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-charcoal">My Wishlist</h1>
              {isLoaded && (
                <p className="text-sm text-brand-slate">
                  {wishlistCount === 0 ? 'No saved items' : `${wishlistCount} saved item${wishlistCount !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          </div>

          {wishlistCount > 0 && (
            <button
              onClick={handleAddAllToCart}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Add All to Cart
            </button>
          )}
        </div>

        {/* Guest banner */}
        {userIsLoaded && !currentUser && (
          <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-2xl px-5 py-4 mb-6 shadow-sm">
            <LogIn className="w-5 h-5 text-brand-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-charcoal">Save your wishlist across devices</p>
              <p className="text-xs text-brand-slate mt-0.5">Log in to sync your wishlist so you never lose your saved items.</p>
            </div>
            <Link
              href="/login?redirect=/wishlist"
              className="flex-shrink-0 px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
            >
              Log In
            </Link>
          </div>
        )}

        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl animate-pulse">
                <div className="aspect-square bg-neutral-200 rounded-t-2xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isLoaded && wishlistCount === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-red-300" />
            </div>
            <h2 className="text-lg font-bold text-brand-charcoal mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-brand-slate mb-6">
              Tap the heart icon on any product to save it here for later.
            </p>
            <Link href="/catalog" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
              Browse Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Wishlist grid */}
        {isLoaded && wishlistCount > 0 && (
          <>
            {/* Mobile: Add all to cart */}
            <button
              onClick={handleAddAllToCart}
              className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm mb-4"
            >
              <ShoppingBag className="w-4 h-4" />
              Add All to Cart
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {wishlistItems.map(product => (
                <div key={product.id} className="relative group">
                  <ProductCard product={product} compact />
                  {/* Remove from wishlist button — overlaid top-right */}
                  <button
                    onClick={() => handleRemove(product)}
                    aria-label={`Remove ${product.name} from wishlist`}
                    className="absolute top-1.5 left-1.5 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full flex items-center justify-center shadow-sm
                               opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
