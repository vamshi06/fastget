'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { ProductCard } from '@/components/ProductCard';
import { ProductReviews } from '@/components/ProductReviews';
import { Product } from '@/types';
import {
  ArrowLeft, Plus, Minus, ShoppingCart,
  AlertCircle, Package, Loader2, Tag, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

// ── Variant type (returned by API) ────────────────────────────────────────────
interface Variant {
  id:            string;
  sku:           string;
  attributes:    Record<string, string>;
  priceRupees:   number;
  mrpRupees?:    number;
  moq:           number;
  stockQuantity: number;
}

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

export default function ProductDetailPage() {
  const params    = useParams();
  const productId = params.id as string;

  const { state, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();

  const [product,           setProduct]           = useState<ProductWithVariants | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [selectedVariant,   setSelectedVariant]   = useState<Variant | null>(null);
  const [relatedProducts,   setRelatedProducts]   = useState<Product[]>([]);
  const [quantity,          setQuantity]          = useState(1);
  const [isAdding,          setIsAdding]          = useState(false);

  // ── Fetch product from API ────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || 'Product not found');
        const p: ProductWithVariants = json.data;
        setProduct(p);
        if (p.variants?.length) setSelectedVariant(p.variants[0]);
      })
      .catch((err) => setError(err.message || 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  // ── Fetch related products when category is known ─────────────────────────
  useEffect(() => {
    if (!product?.category) return;
    fetch(`/api/products?category=${product.category}&limit=5`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRelatedProducts(
            (json.data.products as Product[]).filter((p) => p.id !== productId).slice(0, 4),
          );
        }
      })
      .catch(() => {/* ignore related products error */});
  }, [product?.category, productId]);

  // Keep local quantity in sync with cart
  const cartItem     = product ? state.items.find((i) => i.product.id === product.id) : undefined;
  const cartQuantity = cartItem?.quantity ?? 0;
  useEffect(() => { setQuantity(cartQuantity || 1); }, [cartQuantity]);

  // Effective price comes from the selected variant
  const effectivePrice = selectedVariant?.priceRupees ?? product?.price ?? 0;
  const mrpPrice       = selectedVariant?.mrpRupees   ?? product?.mrpPrice;
  const hasMrp         = mrpPrice && mrpPrice > effectivePrice;
  const discount       = hasMrp ? Math.round(((mrpPrice - effectivePrice) / mrpPrice) * 100) : 0;

  const handleCartAction = () => {
    if (!product) return;
    setIsAdding(true);
    try {
      // Merge selected variant price into the product object before adding
      const cartProduct: Product = {
        ...product,
        price:     effectivePrice,
        mrpPrice:  mrpPrice,
        variantId: selectedVariant?.id ?? product.variantId,
        sku:       selectedVariant?.sku ?? product.sku,
        unit:      selectedVariant?.attributes?.uom ?? product.unit,
      };
      if (cartQuantity === 0) {
        addItem(cartProduct, quantity);
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
    if (!product) return;
    const prev = cartQuantity;
    try {
      removeItem(product.id);
      setQuantity(1);
      showToast(`${product.name} removed from cart`, 'success', {
        label: 'Undo',
        onClick: () => addItem(product, prev),
      });
    } catch {
      showToast('Could not remove item. Try again.', 'error');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-fog flex items-center justify-center gap-3 text-brand-slate">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        Loading product…
      </div>
    );
  }

  // ── Error / Not Found ─────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Product Not Found</h1>
          <p className="text-brand-slate mb-8">{error || "The product you're looking for doesn't exist."}</p>
          <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const variants = product.variants ?? [];

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm flex-wrap">
          <Link href="/catalog" className="text-brand-primary hover:text-brand-dark flex items-center gap-1 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Catalog
          </Link>
          {product.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-brand-steel" />
              <Link
                href={`/catalog?category=${product.category}`}
                className="text-brand-slate hover:text-brand-primary capitalize transition-colors"
              >
                {product.categoryName || product.category.replace(/[-_]/g, ' ')}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-brand-steel" />
          <span className="text-brand-charcoal font-medium line-clamp-1">{product.name}</span>
        </div>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-10 mb-16">

          {/* Image */}
          <div
            className="card p-6 flex items-center justify-center min-h-[300px]"
            style={{ background: 'linear-gradient(135deg, #F5F5F5 0%, #EBEBEB 100%)' }}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-[400px] sm:h-[500px] object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <Package className="w-20 h-20 text-brand-steel opacity-40" />
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">

            {/* Brand + title */}
            <div>
              {product.brand && (
                <p className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-1">
                  {product.brand}
                </p>
              )}
              <h1 className="text-3xl font-black text-brand-charcoal mb-1">{product.name}</h1>
              {product.sku && (
                <p className="text-xs text-brand-steel">SKU: {selectedVariant?.sku ?? product.sku}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-3xl font-black text-brand-primary">
                {formatCurrency(effectivePrice)}
              </span>
              {hasMrp && (
                <span className="text-lg text-brand-steel line-through mb-0.5">
                  {formatCurrency(mrpPrice!)}
                </span>
              )}
              {discount > 0 && (
                <span className="bg-green-100 text-green-800 text-sm font-bold px-2.5 py-1 rounded-full">
                  {discount}% off
                </span>
              )}
              <span className="text-brand-slate text-sm mb-0.5">/ {product.unit}</span>
            </div>

            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-semibold text-brand-graphite mb-3 uppercase tracking-wide">
                  Select Size / Type
                </h3>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const label = v.attributes.size || v.attributes.colour || v.sku;
                    const active = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          active
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-brand-charcoal border-neutral-200 hover:border-brand-primary'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-bold text-brand-charcoal mb-2">Description</h3>
                <p className="text-brand-slate text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Attributes */}
            {selectedVariant && Object.keys(selectedVariant.attributes).length > 0 && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-bold text-brand-charcoal mb-3">Specifications</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {Object.entries(selectedVariant.attributes)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-neutral-50">
                        <dt className="text-xs text-brand-steel capitalize">{k}</dt>
                        <dd className="text-xs font-semibold text-brand-charcoal">{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}

            {/* MOQ notice */}
            {selectedVariant && selectedVariant.moq > 1 && (
              <p className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <Tag className="w-4 h-4 flex-shrink-0" />
                Minimum order quantity: {selectedVariant.moq} {product.unit}
              </p>
            )}

            {/* Availability */}
            <div className="border-t border-neutral-100 pt-5">
              {product.stockStatus === 'out' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-neutral-100 text-neutral-500">
                  Out of Stock
                </span>
              ) : product.stockStatus === 'low' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
                  Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  In Stock
                </span>
              )}
            </div>

            {/* Purchase Controls */}
            <div className="border-t border-neutral-100 pt-5 space-y-4">
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
                      {formatCurrency(effectivePrice * quantity)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {product.stockStatus === 'out' ? (
                  <button
                    disabled
                    className="w-full py-4 text-base bg-neutral-100 text-neutral-400 rounded-xl cursor-not-allowed font-medium"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <button
                    onClick={handleCartAction}
                    disabled={isAdding}
                    className={`btn-primary w-full py-4 text-base ${isAdding ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {cartQuantity === 0 ? 'Adding…' : 'Updating…'}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        {cartQuantity === 0 ? 'Add to Cart' : 'Update Cart'}
                      </>
                    )}
                  </button>
                )}

                {cartQuantity > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-slate">
                      In cart: <span className="font-semibold text-brand-charcoal">{cartQuantity}</span>
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
          </div>
        </div>

        {/* Ratings & Reviews */}
        <ProductReviews productCode={product.id} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-brand-charcoal mb-6">Related Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
