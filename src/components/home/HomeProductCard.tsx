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

  const discountPct =
    product.mrpPrice && product.mrpPrice > product.price
      ? Math.round((1 - product.price / product.mrpPrice) * 100)
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
      className="group flex-shrink-0 w-44 sm:w-48 bg-white rounded-2xl border border-neutral-100 overflow-hidden
                 hover:border-neutral-200 hover:-translate-y-0.5 transition-all duration-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* Image area */}
      <div className="relative w-full h-36 bg-neutral-50 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 176px, 192px"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-neutral-200" />
          </div>
        )}

        {discountPct >= 5 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-md leading-none">
            {discountPct}% OFF
          </div>
        )}

        {product.stockStatus === 'low' && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md leading-none">
            Low Stock
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-xs font-semibold text-brand-slate bg-white px-2 py-1 rounded-md border border-neutral-200">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {product.brand && (
          <p className="text-[10px] text-brand-steel uppercase tracking-wider font-semibold mb-0.5 truncate">
            {product.brand}
          </p>
        )}

        <h3 className="text-sm font-semibold text-brand-charcoal leading-snug line-clamp-2 mb-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        <p className="text-[11px] text-brand-steel mb-2">{product.unit}</p>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="text-base font-bold text-brand-charcoal">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.mrpPrice && product.mrpPrice > product.price && (
            <span className="text-xs text-brand-steel line-through">
              ₹{product.mrpPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Cart control */}
        {inStock ? (
          qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                         text-xs font-semibold bg-brand-primary text-white
                         hover:bg-brand-dark active:scale-[0.97] transition-all duration-150"
              style={{ boxShadow: '0 2px 6px rgba(245,166,35,0.28)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          ) : (
            <div className="flex items-center justify-between bg-primary-50 rounded-xl p-1">
              <button
                onClick={handleDecrease}
                className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center
                           hover:border-brand-primary hover:text-brand-primary active:scale-95
                           transition-all duration-150 text-brand-charcoal"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-brand-charcoal min-w-[20px] text-center">{qty}</span>
              <button
                onClick={handleIncrease}
                className="w-7 h-7 rounded-lg bg-brand-primary border border-brand-primary flex items-center justify-center
                           hover:bg-brand-dark active:scale-95 transition-all duration-150 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        ) : (
          <button
            disabled
            className="w-full py-2 rounded-xl text-xs font-semibold bg-neutral-100 text-brand-steel cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </Link>
  );
}
