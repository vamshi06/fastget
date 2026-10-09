'use client';

import { Plus, Minus, Package, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCart, getMinOrderQty } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { haptic } from '@/lib/native-bridge';
import { Product } from '@/types';

interface HomeProductCardProps {
  product: Product;
}

export function HomeProductCard({ product }: HomeProductCardProps) {
  const { state, addItem, updateQuantity } = useCart();
  const { showToast } = useToast();
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tp = useTranslations('product');

  const cartItem = state.items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const minQty = getMinOrderQty(product);
  const inStock = product.stockStatus !== 'out';

  const hasMrp = product.mrpPrice && product.mrpPrice > product.price;
  const savings = hasMrp ? product.mrpPrice! - product.price : 0;
  const discountPct = hasMrp
    ? Math.round((savings / product.mrpPrice!) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, minQty); // the cart also enforces this
    haptic('light');
    showToast(
      minQty > 1
        ? tc('addedToCartMin', { qty: minQty, name: product.name })
        : tc('addedToCart', { name: product.name }),
      'success',
      { label: tc('viewCart'), href: '/cart' },
    );
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, qty + 1);
    haptic('light');
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, qty - 1);
    haptic('light');
  };

  return (
    // ~2.5 cards visible on a phone so the row clearly scrolls sideways.
    <Link
      href={`/product/${product.id}`}
      className="pressable snap-start flex-shrink-0 w-[38vw] max-w-[160px] sm:w-[160px] bg-white rounded-2xl border border-neutral-100 overflow-hidden flex flex-col"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      {/* Square image area */}
      <div className="relative w-full aspect-square bg-neutral-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="160px"
            className="object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-neutral-200" />
          </div>
        )}

        {/* Flash-sale badge takes priority over the regular discount badge */}
        {product.isFlashSale ? (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-1 rounded-md leading-none animate-pulse">
            <Zap className="w-2.5 h-2.5 fill-current" />
            {t('dealLabel', { price: product.price })}
          </div>
        ) : discountPct >= 3 && (
          <div className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-1 rounded-md leading-none">
            {t('offLabel', { pct: discountPct })}
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-neutral-500">{tc('outOfStock')}</span>
          </div>
        )}

        {/* Cart control - overlaid at bottom-right of image */}
        {inStock && (
          <div className="absolute bottom-1.5 right-1.5" onClick={e => e.preventDefault()}>
            {qty === 0 ? (
              <button
                onClick={handleAdd}
                aria-label={tp('addToCart')}
                className="pressable w-9 h-9 bg-white border border-brand-primary/40 rounded-xl flex items-center justify-center shadow-sm hover:border-brand-primary"
              >
                <Plus className="w-5 h-5 text-brand-primary" />
              </button>
            ) : (
              <div className="flex items-center bg-brand-primary rounded-xl shadow-sm">
                <button onClick={handleDecrease} className="w-8 h-9 flex items-center justify-center text-white">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-white text-sm font-bold min-w-[16px] text-center">{qty}</span>
                <button onClick={handleIncrease} className="w-8 h-9 flex items-center justify-center text-white">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-2.5 pt-2 pb-2.5 flex-1">
        {/* Name first, two lines reserved so prices line up across the row */}
        <p className="text-[13px] font-medium text-brand-charcoal line-clamp-2 leading-snug min-h-[2.5em]">
          {product.name}
        </p>

        {/* Unit */}
        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
          {minQty > 1 ? tp('minOrder', { moq: minQty, unit: product.unit }) : product.unit}
        </p>

        {/* Price row */}
        <div className="flex items-baseline gap-1 flex-wrap mt-1.5">
          <span className="text-[15px] font-black text-brand-charcoal">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasMrp && (
            <span className="text-[11px] text-neutral-400 line-through">
              ₹{product.mrpPrice!.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Savings */}
        {savings > 0 && (
          <p className="text-[11px] font-bold text-green-600">
            {t('amountOffLabel', { amount: savings.toLocaleString('en-IN') })}
          </p>
        )}
      </div>
    </Link>
  );
}
