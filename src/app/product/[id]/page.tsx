'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { products, getProductById } from '@/data/products';
import { useCart } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
  Package,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const product = getProductById(productId);

  const { state, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();

  const cartItem = product
    ? state.items.find((item) => item.product.id === product.id)
    : undefined;

  const cartQuantity = cartItem?.quantity || 0;
  const [quantity, setQuantity] = useState(cartQuantity || 1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setQuantity(cartQuantity || 1);
  }, [cartQuantity]);

  if (!product) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Product Not Found</h1>
          <p className="text-brand-slate mb-8">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const handleCartAction = () => {
    setIsAdding(true);
    try {
      if (cartQuantity === 0) {
        addItem(product, quantity);
        showToast(`${product.name} added to cart`, 'success', { label: 'View Cart', href: '/cart' });
      } else {
        updateQuantity(product.id, quantity);
        showToast('Quantity updated in cart', 'success', { label: 'View Cart', href: '/cart' });
      }
    } catch {
      showToast('Could not add item. Try again.', 'error');
    } finally {
      setTimeout(() => setIsAdding(false), 400);
    }
  };

  const handleRemoveFromCart = () => {
    const removedQuantity = cartQuantity;
    try {
      removeItem(product.id);
      setQuantity(1);
      showToast(`${product.name} removed from cart`, 'success', {
        label: 'Undo',
        onClick: () => addItem(product, removedQuantity),
      });
    } catch {
      showToast('Could not remove item. Try again.', 'error');
    }
  };

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link
            href="/catalog"
            className="text-brand-primary hover:text-brand-dark flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Catalog
          </Link>
          <span className="text-brand-steel">/</span>
          <span className="text-brand-charcoal font-medium">{product.name}</span>
        </div>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-10 mb-16">

          {/* Image */}
          <div className="card p-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F5F5F5 0%, #EBEBEB 100%)' }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-[500px] object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <Package className="w-20 h-20 text-brand-steel opacity-40" />
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-8">

            {/* Title + Price */}
            <div>
              <h1 className="text-4xl font-black text-brand-charcoal mb-3">{product.name}</h1>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-brand-primary">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-brand-slate mb-1">per {product.unit}</span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-neutral-100 pt-6">
              <h3 className="text-lg font-bold text-brand-charcoal mb-3">Description</h3>
              <p className="text-brand-slate leading-relaxed">{product.description}</p>
            </div>

            {/* Stock */}
            <div className="border-t border-neutral-100 pt-6">
              <h3 className="text-lg font-bold text-brand-charcoal mb-3">Availability</h3>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  product.stockStatus === 'in_stock'
                    ? 'bg-green-100 text-green-800'
                    : product.stockStatus === 'low'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {product.stockStatus === 'in_stock'
                  ? 'In Stock'
                  : product.stockStatus === 'low'
                  ? 'Low Stock'
                  : 'Out of Stock'}
              </div>
            </div>

            {/* Purchase Controls */}
            {product.stockStatus !== 'out' && (
              <div className="border-t border-neutral-100 pt-6 space-y-5">

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-brand-graphite mb-3 uppercase tracking-wide">
                    Quantity
                  </label>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-1 bg-primary-50 rounded-xl border border-primary-200">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:border-brand-primary hover:text-brand-primary transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-brand-charcoal font-bold text-lg">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-lg bg-brand-primary hover:bg-brand-dark flex items-center justify-center transition-all"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-brand-steel uppercase tracking-wide">Total</p>
                      <p className="text-xl font-black text-brand-charcoal">
                        {formatCurrency(product.price * quantity)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-3">
                  <button
                    onClick={handleCartAction}
                    disabled={isAdding}
                    className={`btn-primary w-full py-4 text-base ${isAdding ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {cartQuantity === 0 ? 'Adding...' : 'Updating...'}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        {cartQuantity === 0 ? 'Add to Cart' : 'Update Cart'}
                      </>
                    )}
                  </button>

                  {cartQuantity > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brand-slate">
                        In cart:{' '}
                        <span className="font-semibold text-brand-charcoal">{cartQuantity}</span>
                      </span>
                      <button
                        onClick={handleRemoveFromCart}
                        className="text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-brand-charcoal mb-6">Related Products</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((relProduct) => (
                <Link
                  key={relProduct.id}
                  href={`/product/${relProduct.id}`}
                  className="card overflow-hidden hover:scale-[1.01] transition-all"
                >
                  <div
                    className="h-44 overflow-hidden flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #F5F5F5 0%, #EBEBEB 100%)' }}
                  >
                    {relProduct.imageUrl ? (
                      <img
                        src={relProduct.imageUrl}
                        alt={relProduct.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-brand-steel opacity-40" />
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-brand-charcoal mb-2 line-clamp-2 text-sm">
                      {relProduct.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-brand-primary">
                        {formatCurrency(relProduct.price)}
                      </span>
                      <span className="text-xs text-brand-steel">{relProduct.unit}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
