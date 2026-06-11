'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus, Package, Loader2, Tag } from 'lucide-react';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { state, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const cartItem = state.items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const hasMrp   = product.mrpPrice && product.mrpPrice > product.price;
  const discount = hasMrp
    ? Math.round(((product.mrpPrice! - product.price) / product.mrpPrice!) * 100)
    : 0;
  const savings  = hasMrp ? product.mrpPrice! - product.price : 0;

  const handleIncrement = () => {
    if (quantity === 0) {
      setIsAdding(true);
      try {
        addItem(product, 1);
        showToast(`${product.name} added to cart`, 'success', { label: 'View Cart', href: '/cart' });
      } catch {
        showToast('Could not add item. Try again.', 'error');
      } finally {
        setTimeout(() => setIsAdding(false), 400);
      }
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else {
      try {
        removeItem(product.id);
        showToast(`${product.name} removed from cart`, 'success', {
          label: 'Undo',
          onClick: () => addItem(product, 1),
        });
      } catch {
        showToast('Could not remove item. Try again.', 'error');
      }
    }
  };

  /* ── Compact (Zepto-style) ────────────────────────────────────────────── */
  if (compact) {
    return (
      <Link href={`/product/${product.id}`}>
        <div className="product-card h-full flex flex-col">

          {/* Square image with overlaid cart control */}
          <div className="relative w-full aspect-square bg-white">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <Package className="w-8 h-8 text-brand-slate" />
              </div>
            )}

            {discount > 0 && (
              <span className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                {discount}% OFF
              </span>
            )}

            {product.stockStatus === 'out' && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-neutral-500">Out of Stock</span>
              </div>
            )}

            {/* Cart control — overlaid bottom-right of image */}
            {product.stockStatus !== 'out' && (
              <div className="absolute bottom-1.5 right-1.5" onClick={e => e.preventDefault()}>
                {quantity === 0 ? (
                  <button
                    onClick={handleIncrement}
                    disabled={isAdding}
                    className="w-7 h-7 bg-white border border-neutral-200 rounded-xl flex items-center justify-center shadow-sm hover:border-brand-primary transition-colors"
                  >
                    {isAdding
                      ? <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                      : <Plus className="w-4 h-4 text-brand-primary" />}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-brand-primary rounded-xl px-1.5 py-1">
                    <button onClick={handleDecrement} className="text-white"><Minus className="w-3 h-3" /></button>
                    <span className="text-white text-[11px] font-bold min-w-[14px] text-center">{quantity}</span>
                    <button onClick={handleIncrement} className="text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-2 pt-1.5 pb-2 flex flex-col flex-grow">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-sm font-black text-brand-charcoal">{formatCurrency(product.price)}</span>
              {hasMrp && <span className="text-[10px] text-neutral-400 line-through">{formatCurrency(product.mrpPrice!)}</span>}
            </div>
            {savings > 0 && (
              <p className="text-[9px] font-bold text-green-600 mb-0.5">₹{savings.toLocaleString('en-IN')} OFF</p>
            )}
            <p className="text-[10px] font-medium text-brand-charcoal line-clamp-2 leading-tight mb-0.5 flex-grow">
              {product.name}
            </p>
            <p className="text-[9px] text-neutral-400">{product.unit}</p>
          </div>

        </div>
      </Link>
    );
  }

  /* ── Full size ────────────────────────────────────────────────────────── */
  return (
    <Link href={`/product/${product.id}`}>
      <div className="product-card h-full flex flex-col">

        <div className="h-48 flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ background: '#FFFFFF' }}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-3" loading="lazy" />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-40">
              <Package className="w-8 h-8 text-brand-slate" />
            </div>
          )}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {discount}% off
            </span>
          )}
          {product.stockStatus === 'out' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs font-semibold text-neutral-500 bg-white px-2.5 py-1 rounded-full border border-neutral-200">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-grow">
          {product.brand && (
            <p className="text-[11px] font-semibold text-brand-primary uppercase tracking-wide mb-0.5">{product.brand}</p>
          )}
          <h3 className="font-semibold text-brand-charcoal text-sm mb-1 line-clamp-2 leading-snug">{product.name}</h3>
          <div className="mb-3 flex-grow">
            <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">{product.description}</p>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-brand-charcoal">{formatCurrency(product.price)}</span>
              {hasMrp && <span className="text-xs text-brand-steel line-through">{formatCurrency(product.mrpPrice!)}</span>}
            </div>
            <span className="text-xs text-brand-steel">/{product.unit}</span>
          </div>
          {product.moq && product.moq > 1 && (
            <p className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mb-2">
              <Tag className="w-3 h-3 flex-shrink-0" />
              Min. order: {product.moq} {product.unit}
            </p>
          )}
          <div onClick={(e) => e.preventDefault()}>
            {product.stockStatus === 'out' ? (
              <button disabled className="w-full py-2 px-4 bg-neutral-100 text-neutral-400 rounded-xl cursor-not-allowed text-sm font-medium">Out of Stock</button>
            ) : quantity === 0 ? (
              <button onClick={handleIncrement} disabled={isAdding} className={`btn-primary w-full py-2 text-sm ${isAdding ? 'opacity-75 cursor-not-allowed' : ''}`}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Add to Cart</>}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 p-1 bg-primary-50 rounded-xl border border-primary-200">
                <button onClick={handleDecrement} className="w-8 h-8 rounded-lg bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary flex items-center justify-center transition-all">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="flex-1 text-center text-sm font-bold text-brand-charcoal">{quantity}</span>
                <button onClick={handleIncrement} className="w-8 h-8 rounded-lg bg-brand-primary hover:bg-brand-dark flex items-center justify-center transition-all" style={{ boxShadow: '0 2px 6px rgba(245,166,35,0.30)' }}>
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
