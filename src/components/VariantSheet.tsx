'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Package, Plus, ShoppingCart, X } from 'lucide-react';
import { useCart, getMinOrderQty } from '@/components/CartContext';
import { useBackToClose, useLockBodyScroll } from '@/lib/use-back-to-close';
import { haptic, useNativeBackHandler } from '@/lib/native-bridge';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types';

interface VariantSheetProps {
  /** Any size of the family - the card's product. */
  product: Product;
  open: boolean;
  onClose: () => void;
}

/**
 * "Choose a size" sheet for a variant family, opened from a catalog card's +.
 * Every size has its own price, stock and quantity stepper (each is a
 * separate cart line), so several sizes can be added in one go.
 * Bottom sheet on phones, centred dialog on larger screens.
 */
export function VariantSheet({ product, open, onClose }: VariantSheetProps) {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { state, addItem, updateQuantity } = useCart();
  const [sizes, setSizes] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  const { close, release } = useBackToClose(open, onClose);
  useLockBodyScroll(open);
  useNativeBackHandler(open, close);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    fetch(`/api/products/${encodeURIComponent(product.id)}/family?lang=${locale}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error();
        const list = json.data.products as Product[];
        setSizes(list.length > 0 ? list : [product]);
      })
      .catch(() => setFailed(true));
  }, [open, product, locale]);

  if (!open) return null;

  const qtyOf = (id: string) => state.items.find((i) => i.product.id === id)?.quantity ?? 0;
  const familyIds = new Set((sizes ?? []).map((s) => s.id));
  const familyCount = state.items.filter((i) => familyIds.has(i.product.id)).reduce((n, i) => n + i.quantity, 0);

  const goToCart = () => {
    release();
    onClose();
    router.push('/cart');
  };

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={t('chooseSize')}>
      <div className="absolute inset-0 bg-black/50 animate-screen-in" onClick={close} />
      <div className="relative w-full md:max-w-md max-h-[85vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-xl animate-sheet-up md:animate-screen-in motion-reduce:animate-none">
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-neutral-300" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-3 pb-3 border-b border-neutral-100">
          <div className="min-w-0 flex-1">
            {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{product.brand}</p>}
            <h2 className="text-base font-bold text-brand-charcoal leading-snug">{product.name}</h2>
            <p className="text-xs text-brand-slate mt-0.5">{t('chooseSize')}</p>
          </div>
          <button type="button" onClick={close} aria-label={tc('close')} className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-brand-graphite" />
          </button>
        </div>

        {/* Sizes */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          {failed ? (
            <p className="px-2 py-8 text-center text-sm text-brand-slate">{t('sizesLoadFailed')}</p>
          ) : !sizes ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {sizes.map((size) => {
                const qty = qtyOf(size.id);
                const min = getMinOrderQty(size);
                const out = size.stockStatus === 'out';
                const hasMrp = size.mrpPrice && size.mrpPrice > size.price;
                return (
                  <li key={size.id} className="flex items-center gap-3 px-2 py-3">
                    <div className="relative w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex-shrink-0 overflow-hidden">
                      {size.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={size.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package className="w-5 h-5 text-neutral-300 m-auto mt-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-charcoal">{size.optionLabel ?? size.name}</p>
                      <p className="text-sm">
                        <span className="font-bold text-brand-charcoal">{formatCurrency(size.price)}</span>
                        {hasMrp && <span className="ml-1.5 text-xs text-neutral-400 line-through">{formatCurrency(size.mrpPrice!)}</span>}
                        <span className="ml-1 text-xs text-brand-slate">/ {size.unit}</span>
                      </p>
                      {min > 1 && <p className="text-[11px] text-brand-slate">{t('minOrder', { moq: min, unit: size.unit })}</p>}
                    </div>
                    {out ? (
                      <span className="text-xs font-semibold text-neutral-400">{tc('outOfStock')}</span>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => { addItem(size, min); haptic('light'); }}
                        className="pressable h-9 px-4 rounded-xl border border-brand-primary/50 text-sm font-bold text-brand-primary hover:bg-primary-50"
                      >
                        {t('add')}
                      </button>
                    ) : (
                      <div className="flex items-center bg-brand-primary rounded-xl">
                        <button type="button" aria-label={t('decreaseQuantity')} onClick={() => { updateQuantity(size.id, qty - 1); haptic('light'); }} className="w-9 h-9 flex items-center justify-center text-white">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-bold text-white">{qty}</span>
                        <button type="button" aria-label={t('increaseQuantity')} onClick={() => { updateQuantity(size.id, qty + 1); haptic('light'); }} className="w-9 h-9 flex items-center justify-center text-white">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-neutral-100">
          {familyCount > 0 ? (
            <button type="button" onClick={goToCart} className="btn-primary w-full h-12 text-base">
              <ShoppingCart className="w-5 h-5" />
              {tc('viewCart')} · {t('sheetInCart', { count: familyCount })}
            </button>
          ) : (
            <button type="button" onClick={close} className="btn-secondary w-full h-12 text-base">
              {tc('close')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
