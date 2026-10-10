'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToast } from './ToastContext';
import { useWishlist } from './WishlistContext';
import { haptic } from '@/lib/native-bridge';
import { Product } from '@/types';

interface WishlistHeartProps {
  product: Product;
  /** Positioning/size classes for the round button, e.g. "absolute top-2 right-2 w-8 h-8". */
  className?: string;
  iconClassName?: string;
}

// Round heart toggle laid over a product image. Safe inside a <Link>:
// the click never triggers navigation.
export function WishlistHeart({ product, className = 'w-8 h-8', iconClassName = 'w-4 h-4' }: WishlistHeartProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showToast } = useToast();
  const t = useTranslations('product');

  const wishlisted = isInWishlist(product.id);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic('light');
    if (wishlisted) {
      if (await removeFromWishlist(product.id)) showToast(t('wishlistRemoved'), 'success');
      else showToast(t('wishlistRemoveFailed'), 'error');
    } else {
      if (await addToWishlist(product)) {
        showToast(t('wishlistSaved'), 'success', { label: t('viewWishlist'), href: '/wishlist' });
      } else {
        showToast(t('wishlistSaveFailed'), 'error');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={wishlisted ? t('removeFromWishlist') : t('addToWishlist')}
      aria-pressed={wishlisted}
      className={`z-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm border border-neutral-100 hover:scale-110 active:scale-90 transition-transform ${className}`}
    >
      <Heart className={`${iconClassName} ${wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} />
    </button>
  );
}
