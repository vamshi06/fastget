'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCart, getOriginalUnitPrice, getMinOrderQty, FLASH_SALE_QTY_PER_ORDER, productProps } from '@/components/CartContext';
import { track } from '@/lib/analytics';
import { useToast } from '@/components/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { HomeProductCard } from '@/components/home/HomeProductCard';
import { WishlistHeart } from '@/components/WishlistHeart';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductDetailSkeleton } from '@/components/Skeletons';
import { QuantityInput } from '@/components/QuantityInput';
import { useLockBodyScroll } from '@/lib/use-back-to-close';
import { useNativeBackHandler } from '@/lib/native-bridge';
import { haptic, useNativeTitle } from '@/lib/native-bridge';
import { Product } from '@/types';
import {
  ArrowLeft, Plus, Minus, ShoppingCart,
  AlertCircle, Package, Loader2, Tag, ChevronRight, X, ZoomIn, MessageCircle,
} from 'lucide-react';
import { WhatsAppChatLink } from '@/components/WhatsAppChatLink';
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
  const productId = decodeURIComponent(params.id as string);
  const router    = useRouter();

  const { state, addItem, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const t  = useTranslations('product');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [product,          setProduct]           = useState<ProductWithVariants | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [selectedVariant,   setSelectedVariant]   = useState<Variant | null>(null);
  const [relatedProducts,   setRelatedProducts]   = useState<Product[]>([]);
  // Other sizes of this item (variant family) - each its own product page.
  const [family,            setFamily]            = useState<Product[]>([]);
  const [quantity,          setQuantity]          = useState(1);
  const [isAdding,          setIsAdding]          = useState(false);
  // Full-screen image viewer (tap the photo to zoom in on details).
  const [zoomOpen,          setZoomOpen]          = useState(false);
  useLockBodyScroll(zoomOpen);
  useNativeBackHandler(zoomOpen, () => setZoomOpen(false));

  // App top bar shows the product name once it's loaded.
  useNativeTitle(product?.name);

  // ── Fetch product from API ────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${encodeURIComponent(productId)}?lang=${locale}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || t('productNotFoundTitle'));
        const p: ProductWithVariants = json.data;
        setProduct(p);
        if (p.variants?.length) setSelectedVariant(p.variants[0]);
        track('product_viewed', { ...productProps(p), stock_status: p.stockStatus });
      })
      .catch((err) => setError(err.message || t('failedToLoadProduct')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, locale]);

  // ── Sizes in this product's family (none for a standalone product) ────────
  useEffect(() => {
    if (!productId) return;
    fetch(`/api/products/${encodeURIComponent(productId)}/family?lang=${locale}`)
      .then((r) => r.json())
      .then((json) => setFamily(json.success ? (json.data.products as Product[]) : []))
      .catch(() => setFamily([]));
  }, [productId, locale]);

  const familyEntry = family.find((p) => p.id === productId);

  // Switching size opens that size's own page - replace, so Back leaves the
  // product instead of stepping through every size tried.
  const selectSize = (code: string) => {
    if (code === productId) return;
    haptic('light');
    router.replace(`/product/${encodeURIComponent(code)}` as any, { scroll: false });
  };

  // ── Fetch related products when category is known ─────────────────────────
  useEffect(() => {
    if (!product?.category) return;
    fetch(`/api/products?category=${product.category}&limit=9&lang=${locale}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRelatedProducts(
            (json.data.products as Product[])
              // Not this product, nor another size of it (those are the size buttons).
              .filter((p) => p.id !== productId && !(familyEntry?.familyId && p.familyId === familyEntry.familyId))
              .slice(0, 8),
          );
        }
      })
      .catch(() => {/* ignore related products error */});
  }, [product?.category, productId, locale, familyEntry?.familyId]);

  // Keep local quantity in sync with cart, respecting the variant's MOQ
  const cartItem     = product ? state.items.find((i) => i.product.id === product.id) : undefined;
  const cartQuantity = cartItem?.quantity ?? 0;
  const moq           = selectedVariant?.moq && selectedVariant.moq > 0
    ? selectedVariant.moq
    : (product ? getMinOrderQty(product) : 1);
  useEffect(() => { setQuantity(cartQuantity > 0 ? cartQuantity : moq); }, [cartQuantity, moq]);

  // Effective price comes from the selected variant
  const effectivePrice = selectedVariant?.priceRupees ?? product?.price ?? 0;
  const mrpPrice       = selectedVariant?.mrpRupees   ?? product?.mrpPrice;
  const hasMrp         = mrpPrice && mrpPrice > effectivePrice;
  const discount       = hasMrp ? Math.round(((mrpPrice - effectivePrice) / mrpPrice) * 100) : 0;
  // Flash price covers only the first FLASH_SALE_QTY_PER_ORDER units; the rest
  // are charged at the original price (mirrors CartContext.getLineTotal).
  const saleQty        = product?.isFlashSale ? Math.min(quantity, FLASH_SALE_QTY_PER_ORDER) : quantity;
  const lineTotal      = effectivePrice * saleQty
    + (product ? getOriginalUnitPrice(product) : effectivePrice) * (quantity - saleQty);

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
        moq,       // the selected variant's minimum, so the cart enforces it too
        // Lets catalog cards count this line under the family's + badge.
        familyId:    familyEntry?.familyId,
        familySize:  familyEntry?.familySize,
        optionLabel: familyEntry?.optionLabel,
      };
      const safeQuantity = Math.max(moq, quantity);
      haptic('success');
      // No success toast: the button turning into "View Cart" and the
      // "In cart: N" line already confirm it.
      if (cartQuantity === 0) {
        addItem(cartProduct, safeQuantity);
      } else {
        updateQuantity(product.id, safeQuantity);
      }
    } catch {
      showToast(t('couldNotAddItem'), 'error');
    } finally {
      setTimeout(() => setIsAdding(false), 400);
    }
  };

  const handleRemoveFromCart = () => {
    if (!product) return;
    const prev = cartQuantity;
    try {
      removeItem(product.id);
      setQuantity(moq);
      showToast(t('removedFromCart', { name: product.name }), 'success', {
        label: t('undo'),
        onClick: () => addItem(product, prev),
      });
    } catch {
      showToast(t('couldNotRemoveItem'), 'error');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  // Switching size keeps the current page up while the next one loads.
  if (loading && !product) {
    return <ProductDetailSkeleton />;
  }

  // ── Error / Not Found ─────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">{t('productNotFoundTitle')}</h1>
          <p className="text-brand-slate mb-8">{error || t('productNotFoundMessage')}</p>
          <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
            <ArrowLeft className="w-5 h-5" />
            {t('backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  const variants = product.variants ?? [];

  return (
    // pb-32 on phones keeps the last content clear of the pinned action bar.
    <div className="min-h-screen bg-brand-fog pt-4 pb-32 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb - desktop only; on phones Back does this job */}
        <div className="mb-8 hidden md:flex items-center gap-2 text-sm flex-wrap">
          <Link href="/catalog" className="text-brand-primary hover:text-brand-dark flex items-center gap-1 font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('catalogBreadcrumb')}
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
        <div className="grid lg:grid-cols-2 gap-6 md:gap-10 mb-10 md:mb-16">

          {/* Image */}
          <div
            className="card relative p-3 md:p-6 flex items-center justify-center md:min-h-[300px]"
            style={{ background: 'linear-gradient(135deg, #F5F5F5 0%, #EBEBEB 100%)' }}
          >
            <WishlistHeart
              product={product}
              className="absolute top-5 right-5 md:top-8 md:right-8 w-10 h-10"
              iconClassName="w-5 h-5"
            />
            {product.imageUrl ? (
              // Always contained (never cropped) - the whole product shows.
              // Tap opens the full-screen viewer.
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label={t('zoomImage')}
                className="relative w-full cursor-zoom-in"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full aspect-square md:aspect-auto md:h-[500px] object-contain rounded-xl"
                  loading="lazy"
                />
                <span className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-brand-charcoal" />
                </span>
              </button>
            ) : (
              <Package className="w-20 h-20 text-brand-steel opacity-40" />
            )}
          </div>

          {/* Info */}
          <div className="space-y-5 md:space-y-6">

            {/* Brand + title */}
            <div>
              {product.brand && (
                <p className="text-xs md:text-sm font-semibold text-brand-primary uppercase tracking-wider mb-1">
                  {product.brand}
                </p>
              )}
              <h1 className="text-xl md:text-3xl font-black text-brand-charcoal leading-snug mb-1">{product.name}</h1>
              {product.sku && (
                <p className="text-xs text-brand-steel">{t('sku', { sku: selectedVariant?.sku ?? product.sku })}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-black text-brand-primary">
                {formatCurrency(effectivePrice)}
              </span>
              {hasMrp && (
                <span className="text-lg text-brand-steel line-through mb-0.5">
                  {formatCurrency(mrpPrice!)}
                </span>
              )}
              {discount > 0 && (
                <span className="bg-green-100 text-green-800 text-sm font-bold px-2.5 py-1 rounded-full">
                  {t('percentOff', { discount })}
                </span>
              )}
              <span className="text-brand-slate text-sm mb-0.5">/ {product.unit}</span>
            </div>
            {product.isFlashSale && product.saleMinOrderRupees != null && product.saleMinOrderRupees > 0 && (
              <p className="text-xs text-amber-600 font-medium -mt-2">
                {t('flashPriceNote', { amount: formatCurrency(product.saleMinOrderRupees) })}
              </p>
            )}
            {product.isFlashSale && (
              <p className="text-xs text-amber-600 font-medium -mt-2">
                {t('flashSaleLimit', {
                  max: FLASH_SALE_QTY_PER_ORDER,
                  original: formatCurrency(getOriginalUnitPrice(product)),
                })}
              </p>
            )}

            {/* Size buttons - each size of the family is its own product */}
            {family.length > 1 && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-semibold text-brand-graphite mb-3 uppercase tracking-wide">
                  {t('sizeHeading')}
                  {familyEntry?.optionLabel && (
                    <span className="ml-2 normal-case tracking-normal font-bold text-brand-charcoal">{familyEntry.optionLabel}</span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {family.map((size) => {
                    const active = size.id === productId;
                    const out = size.stockStatus === 'out';
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => selectSize(size.id)}
                        aria-pressed={active}
                        className={`pressable min-w-[4.5rem] px-3 py-2 rounded-xl border text-left transition-colors ${
                          active
                            ? 'border-brand-primary bg-primary-50 ring-1 ring-brand-primary'
                            : 'border-neutral-200 bg-white hover:border-brand-primary'
                        } ${out ? 'opacity-50' : ''}`}
                      >
                        <span className={`block text-sm font-semibold ${out ? 'line-through text-brand-steel' : 'text-brand-charcoal'}`}>
                          {size.optionLabel ?? size.name}
                        </span>
                        <span className="block text-xs text-brand-slate">
                          {out ? tc('outOfStock') : formatCurrency(size.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-semibold text-brand-graphite mb-3 uppercase tracking-wide">
                  {t('selectSizeType')}
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
                <h3 className="text-sm font-bold text-brand-charcoal mb-2">{t('description')}</h3>
                <p className="text-brand-slate text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Attributes */}
            {selectedVariant && Object.keys(selectedVariant.attributes).length > 0 && (
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-bold text-brand-charcoal mb-3">{t('specifications')}</h3>
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
                {t('minOrderQty', { moq: selectedVariant.moq, unit: product.unit })}
              </p>
            )}

            {/* Availability */}
            <div className="border-t border-neutral-100 pt-5">
              {product.stockStatus === 'out' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-neutral-100 text-neutral-500">
                  {tc('outOfStock')}
                </span>
              ) : product.stockStatus === 'low' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
                  {t('lowStock')}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {t('inStock')}
                </span>
              )}
            </div>

            {/* Pre-order questions (stock, bulk price, photos) */}
            <WhatsAppChatLink
              text={t('whatsappPrefill', { name: product.name, code: product.id })}
              source="product"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-green-900">{t('whatsappTitle')}</span>
                <span className="block text-xs text-green-800">{t('whatsappSubtitle')}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-green-700 flex-shrink-0" />
            </WhatsAppChatLink>

            {/* Purchase Controls - desktop; phones get the pinned bar below */}
            <div className="hidden md:block border-t border-neutral-100 pt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-graphite mb-3 uppercase tracking-wide">
                  {t('quantity')}
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 p-1 bg-primary-50 rounded-xl border border-primary-200">
                    <button
                      onClick={() => setQuantity(Math.max(moq, quantity - 1))}
                      disabled={quantity <= moq}
                      className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:border-brand-primary hover:text-brand-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-200 disabled:hover:text-inherit"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <QuantityInput
                      value={quantity}
                      min={moq}
                      onCommit={setQuantity}
                      ariaLabel={t('quantity')}
                      className="w-14 h-10 text-lg"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-lg bg-brand-primary hover:bg-brand-dark flex items-center justify-center transition-all"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-steel uppercase tracking-wide">{t('total')}</p>
                    <p className="text-xl font-black text-brand-charcoal">
                      {formatCurrency(lineTotal)}
                    </p>
                    {product.isFlashSale && quantity > saleQty && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        {t('flashBreakdown', {
                          saleQty,
                          saleUnit: formatCurrency(effectivePrice),
                          regularQty: quantity - saleQty,
                          regularUnit: formatCurrency(getOriginalUnitPrice(product)),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {product.stockStatus === 'out' ? (
                  <button
                    disabled
                    className="w-full py-4 text-base bg-neutral-100 text-neutral-400 rounded-xl cursor-not-allowed font-medium"
                  >
                    {tc('outOfStock')}
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
                        {cartQuantity === 0 ? t('adding') : t('updating')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        {cartQuantity === 0 ? t('addToCart') : t('updateCart')}
                      </>
                    )}
                  </button>
                )}

                {cartQuantity > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-slate">
                      {t('inCart', { count: cartQuantity })}
                    </span>
                    <button
                      onClick={handleRemoveFromCart}
                      className="text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      {t('remove')}
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
            <h2 className="section-title mb-3 md:mb-6">{t('relatedProducts')}</h2>
            {/* Same compact card + sideways row as the home screen */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 scroll-px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:scroll-px-0 sm:snap-none">
              {relatedProducts.map((p) => (
                <HomeProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Full-screen image viewer ── */}
      {zoomOpen && product.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label={tc('close')}
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Pinch-zoom works natively on the image; scroll if it's larger than the screen. */}
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4" style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-w-none w-full md:w-auto md:max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ── Pinned action bar (phones) ── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-neutral-200 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {product.stockStatus === 'out' ? (
          <button
            disabled
            className="w-full h-12 bg-neutral-100 text-neutral-400 rounded-xl font-semibold"
          >
            {tc('outOfStock')}
          </button>
        ) : (
          <>
            {cartQuantity > 0 && (
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-brand-slate">{t('inCart', { count: cartQuantity })}</span>
                <button onClick={handleRemoveFromCart} className="text-red-600 font-semibold px-1">
                  {t('remove')}
                </button>
              </div>
            )}
            {product.isFlashSale && quantity > saleQty && (
              <p className="text-[11px] text-amber-700 font-medium mb-2">
                {t('flashBreakdown', {
                  saleQty,
                  saleUnit: formatCurrency(effectivePrice),
                  regularQty: quantity - saleQty,
                  regularUnit: formatCurrency(getOriginalUnitPrice(product)),
                })}
              </p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center h-12 rounded-xl border border-neutral-200 bg-white">
                <button
                  onClick={() => { setQuantity(Math.max(moq, quantity - 1)); haptic('light'); }}
                  disabled={quantity <= moq}
                  aria-label={t('decreaseQuantity')}
                  className="w-11 h-full flex items-center justify-center text-brand-charcoal disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <QuantityInput
                  value={quantity}
                  min={moq}
                  onCommit={setQuantity}
                  ariaLabel={t('quantity')}
                  className="w-12 h-10"
                />
                <button
                  onClick={() => { setQuantity(quantity + 1); haptic('light'); }}
                  aria-label={t('increaseQuantity')}
                  className="w-11 h-full flex items-center justify-center text-brand-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {cartQuantity > 0 && quantity === cartQuantity ? (
                <Link href="/cart" className="btn-primary flex-1 h-12 text-base">
                  <ShoppingCart className="w-5 h-5" />
                  {tc('viewCart')}
                </Link>
              ) : (
                <button
                  onClick={handleCartAction}
                  disabled={isAdding}
                  className="btn-primary flex-1 h-12 text-base disabled:opacity-75"
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {cartQuantity === 0 ? t('addToCart') : t('updateCart')}
                      <span className="opacity-80">· {formatCurrency(lineTotal)}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
