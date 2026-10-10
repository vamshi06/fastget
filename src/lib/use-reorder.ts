'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/components/CartContext';
import { useToast } from '@/components/ToastContext';
import { track } from '@/lib/analytics';
import { Order, Product } from '@/types';

/**
 * "Order again": puts a past order's products back in the cart at today's
 * catalog price (the cart refreshes prices anyway), then opens the cart.
 * Products that are gone or out of stock are skipped and reported.
 */
export function useReorder() {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('order');
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const reorder = useCallback(async (order: Order) => {
    setReorderingId(order.id);
    try {
      // A flash-sale line is stored as two items (sale + regular units) - merge them.
      const qtyBySku = new Map<string, number>();
      for (const item of order.items) qtyBySku.set(item.sku, (qtyBySku.get(item.sku) ?? 0) + item.quantity);

      const results = await Promise.all(
        Array.from(qtyBySku.entries()).map(async ([sku, quantity]) => {
          try {
            const res = await fetch(`/api/products/${encodeURIComponent(sku)}?lang=${locale}`);
            const json = await res.json();
            if (!json.success) return null;
            const { variants: _variants, ...product } = json.data as Product & { variants?: unknown };
            if (product.stockStatus === 'out') return null;
            return { product: product as Product, quantity };
          } catch {
            return null;
          }
        }),
      );

      const available = results.filter((r): r is { product: Product; quantity: number } => r !== null);
      const missing = results.length - available.length;
      if (available.length === 0) {
        showToast(t('reorderNoneAvailable'), 'error');
        return;
      }
      for (const { product, quantity } of available) addItem(product, quantity);
      track('reordered', { order_id: order.id, items: available.length, unavailable: missing });

      showToast(
        missing > 0
          ? `${t('reorderAdded', { count: available.length })} · ${t('reorderSomeUnavailable', { count: missing })}`
          : t('reorderAdded', { count: available.length }),
        'success',
      );
      router.push('/cart');
    } catch {
      showToast(t('reorderFailed'), 'error');
    } finally {
      setReorderingId(null);
    }
  }, [addItem, locale, router, showToast, t]);

  return { reorder, reorderingId };
}
