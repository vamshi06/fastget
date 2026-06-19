'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { CartItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, Loader2 } from 'lucide-react';

export default function CartPage() {
  const {
    state,
    addItem,
    removeItem,
    updateQuantity,
    getSubtotal,
    getConvenienceFee,
    getTotal,
    clearCart,
    isLoaded,
  } = useCart();
  const { showToast } = useToast();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleRemove = (item: CartItem) => {
    setRemovingId(item.product.id);
    try {
      removeItem(item.product.id);
      showToast(`${item.product.name} removed from cart`, 'success', {
        label: 'Undo',
        onClick: () => addItem(item.product, item.quantity),
      });
    } catch {
      showToast('Could not remove item. Try again.', 'error');
    } finally {
      setTimeout(() => setRemovingId(null), 400);
    }
  };

  const handleDecrement = (item: CartItem) => {
    if (item.quantity <= 1) {
      handleRemove(item);
    } else {
      updateQuantity(item.product.id, item.quantity - 1);
    }
  };

  const handleClearCart = () => {
    const count = state.items.length;
    setIsClearing(true);
    try {
      clearCart();
      showToast(
        count === 1 ? '1 item removed from cart' : `${count} items removed from cart`,
        'success'
      );
    } catch {
      showToast('Could not clear cart. Try again.', 'error');
    } finally {
      setTimeout(() => setIsClearing(false), 400);
    }
  };

  if (isLoaded && state.items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-brand-steel" />
          </div>
          <h1 className="text-2xl font-black text-brand-charcoal mb-2">Your cart is empty</h1>
          <p className="text-brand-slate mb-8">
            Add some products to your cart and they will appear here
          </p>
          <Link href="/catalog" className="btn-primary inline-flex px-8 py-3">
            <Package className="w-5 h-5" />
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-brand-charcoal mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {state.items.map((item) => (
              <div key={item.product.id} className="card p-4 flex gap-4 min-w-0 overflow-hidden">
                {/* Product image */}
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #F5F5F5 0%, #EBEBEB 100%)' }}
                >
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-brand-steel opacity-50" />
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-brand-charcoal text-sm leading-snug">{item.product.name}</h3>
                  <p className="text-xs text-brand-slate mb-2 line-clamp-1">{item.product.description}</p>
                  <p className="text-brand-primary font-bold text-sm">
                    {formatCurrency(item.product.price)}{' '}
                    <span className="text-brand-steel font-normal">/ {item.product.unit}</span>
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={removingId === item.product.id}
                    className={`p-1.5 rounded-lg transition-colors ${
                      removingId === item.product.id
                        ? 'text-brand-steel opacity-50 cursor-not-allowed'
                        : 'text-brand-steel hover:text-red-500 hover:bg-red-50'
                    }`}
                    aria-label="Remove item"
                  >
                    {removingId === item.product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-2 p-1 bg-primary-50 rounded-xl border border-primary-200">
                    <button
                      onClick={() => handleDecrement(item)}
                      disabled={removingId === item.product.id}
                      className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:border-brand-primary hover:text-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-brand-charcoal">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-brand-primary hover:bg-brand-dark flex items-center justify-center transition-all"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-brand-charcoal mb-5">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Subtotal</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Convenience Fee (10%)</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(getConvenienceFee())}</span>
                </div>
                <div className="border-t border-neutral-100 pt-3">
                  <div className="flex justify-between font-black text-brand-charcoal">
                    <span>Total</span>
                    <span className="text-xl">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/checkout"
                className="btn-primary w-full py-3 justify-center"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-center text-xs text-brand-steel mt-4">
                💳 Pay on delivery available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
