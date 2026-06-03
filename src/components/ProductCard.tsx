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
}

export function ProductCard({ product }: ProductCardProps) {
  const { state, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const cartItem = state.items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const hasMrp    = product.mrpPrice && product.mrpPrice > product.price;
  const discount  = hasMrp
    ? Math.round(((product.mrpPrice! - product.price) / product.mrpPrice!) * 100)
    : 0;

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

  return (
    <Link href={`/product/${product.id}`}>
      <div className="product-card h-full flex flex-col">

        {/* Image */}
        <div
          className="h-48 flex items-center justify-center overflow-hidden flex-shrink-0 relative"
          style={{ background: '#FFFFFF' }}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-3"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-40">
              <Package className="w-8 h-8 text-brand-slate" />
            </div>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {discount}% off
            </span>
          )}

          {/* Out of stock overlay */}
          {product.stockStatus === 'out' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs font-semibold text-neutral-500 bg-white px-2.5 py-1 rounded-full border border-neutral-200">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Brand */}
          {product.brand && (
            <p className="text-[11px] font-semibold text-brand-primary uppercase tracking-wide mb-0.5">
              {product.brand}
            </p>
          )}

          <h3 className="font-semibold text-brand-charcoal text-sm mb-1 line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <div className="mb-3 flex-grow">
            <div className="relative">
              <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">
                {product.description}
              </p>
              {product.description && (
                <span
                  className="absolute bottom-0 right-0 text-xs text-brand-primary font-medium"
                  style={{
                    background: 'linear-gradient(to right, transparent, white 35%)',
                    paddingLeft: '2.5rem',
                    lineHeight: '1.625',
                  }}
                >
                  read more
                </span>
              )}
            </div>
          </div>

          {/* Price row */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-brand-charcoal">
                {formatCurrency(product.price)}
              </span>
              {hasMrp && (
                <span className="text-xs text-brand-steel line-through">
                  {formatCurrency(product.mrpPrice!)}
                </span>
              )}
            </div>
            <span className="text-xs text-brand-steel">/{product.unit}</span>
          </div>

          {/* MOQ badge if > 1 */}
          {product.moq && product.moq > 1 && (
            <p className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mb-2">
              <Tag className="w-3 h-3 flex-shrink-0" />
              Min. order: {product.moq} {product.unit}
            </p>
          )}

          {/* Cart control */}
          <div onClick={(e) => e.preventDefault()}>
            {product.stockStatus === 'out' ? (
              <button
                disabled
                className="w-full py-2 px-4 bg-neutral-100 text-neutral-400 rounded-xl cursor-not-allowed text-sm font-medium"
              >
                Out of Stock
              </button>
            ) : quantity === 0 ? (
              <button
                onClick={handleIncrement}
                disabled={isAdding}
                className={`btn-primary w-full py-2 text-sm ${isAdding ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Cart
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 p-1 bg-primary-50 rounded-xl border border-primary-200">
                <button
                  onClick={handleDecrement}
                  className="w-8 h-8 rounded-lg bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary flex items-center justify-center transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="flex-1 text-center text-sm font-bold text-brand-charcoal">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-lg bg-brand-primary hover:bg-brand-dark flex items-center justify-center transition-all"
                  style={{ boxShadow: '0 2px 6px rgba(245,166,35,0.30)' }}
                >
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
