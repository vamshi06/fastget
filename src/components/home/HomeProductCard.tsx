'use client';

import { Plus, Minus, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { Product } from '@/types';

interface HomeProductCardProps {
  product: Product;
}

export function HomeProductCard({ product }: HomeProductCardProps) {
  const { state, addItem, updateQuantity } = useCart();
  const { showToast } = useToast();

  const cartItem = state.items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const inStock = product.stockStatus !== 'out';

  const hasMrp = product.mrpPrice && product.mrpPrice > product.price;
  const savings = hasMrp ? product.mrpPrice! - product.price : 0;
  const discountPct = hasMrp
    ? Math.round((savings / product.mrpPrice!) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    showToast(`${product.name} added`, 'success', { label: 'View Cart', href: '/cart' });
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, qty + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, qty - 1);
  };

  return (
    <Link
      href={`/catalog?q=${encodeURIComponent(product.name)}`}
      className="flex-shrink-0 w-[118px] bg-white rounded-2xl border border-neutral-100 overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      {/* Square image area */}
      <div className="relative w-full aspect-square bg-neutral-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="118px"
            className="object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-neutral-200" />
          </div>
        )}

        {/* Discount badge top-left */}
        {discountPct >= 3 && (
          <div className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none">
            {discountPct}% OFF
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-neutral-500">Out of Stock</span>
          </div>
        )}

        {/* Cart control — overlaid at bottom-right of image */}
        {inStock && (
          <div className="absolute bottom-1.5 right-1.5" onClick={e => e.preventDefault()}>
            {qty === 0 ? (
              <button
                onClick={handleAdd}
                className="w-7 h-7 bg-white border border-neutral-200 rounded-xl flex items-center justify-center shadow-sm hover:border-brand-primary hover:text-brand-primary transition-colors"
              >
                <Plus className="w-4 h-4 text-brand-primary" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-brand-primary rounded-xl px-1.5 py-1">
                <button onClick={handleDecrease} className="text-white">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-[11px] font-bold min-w-[14px] text-center">{qty}</span>
                <button onClick={handleIncrease} className="text-white">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-2 pt-1.5 pb-2">
        {/* Price row */}
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-sm font-black text-brand-charcoal">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasMrp && (
            <span className="text-[10px] text-neutral-400 line-through">
              ₹{product.mrpPrice!.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Savings */}
        {savings > 0 && (
          <p className="text-[9px] font-bold text-green-600 mb-0.5">
            ₹{savings.toLocaleString('en-IN')} OFF
          </p>
        )}

        {/* Name */}
        <p className="text-[10px] font-medium text-brand-charcoal line-clamp-2 leading-tight mb-0.5">
          {product.name}
        </p>

        {/* Unit */}
        <p className="text-[9px] text-neutral-400">{product.unit}</p>
      </div>
    </Link>
  );
}
