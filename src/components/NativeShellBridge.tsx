'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/components/CartContext';
import { useUser } from '@/components/UserContext';
import { formatCurrency } from '@/lib/utils';
import { getPageTitle, isNativeApp, postToNative, setPushToken } from '@/lib/native-bridge';
import { getRouteKind, SHELL_COOKIE, SHELL_VERSION } from '@/lib/shell-routes';

/**
 * Keeps the Android app's native chrome (tab bar, top bar - mobile/src/shell)
 * in step with the site. Renders nothing; a no-op outside the app.
 *
 *   site -> app: SHELL_CONFIG (tab labels; also tells the app this site
 *                supports the shell), ROUTE (path + top-bar title),
 *                CART_COUNT (floating cart pill: count, total, nudge)
 *   app -> site: `fastget:navigate` event -> client-side router.push
 */
export function NativeShellBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { getItemCount, getTotal, isLoaded } = useCart();
  const { currentUser } = useUser();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const itemCount = getItemCount();

  // The head script misses `native-shell` when the app's page-start script
  // lands after it (first launch, before the cookie exists) - catch up here.
  useEffect(() => {
    if (!isNativeApp()) return;
    if ((window as any).__FASTGET_SHELL__ || document.cookie.includes(`${SHELL_COOKIE}=${SHELL_VERSION}`)) {
      document.documentElement.classList.add('native-shell');
    }
  }, []);

  // Tab labels follow the site's language.
  useEffect(() => {
    postToNative({
      type: 'SHELL_CONFIG',
      version: Number(SHELL_VERSION),
      labels: {
        home: t('bottomNav.home'),
        categories: t('bottomNav.category'),
        cart: tc('cart'),
        orders: t('bottomNav.orders'),
        account: t('bottomNav.account'),
      },
    });
  }, [locale, t, tc]);

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.setAttribute('data-route-kind', getRouteKind(pathname));
    postToNative({ type: 'ROUTE', path: pathname, title: getPageTitle(pathname) ?? defaultTitle(pathname) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale]);

  // First-order coupon eligibility, for the cart pill's nudge. Same endpoint
  // the cart page uses; the order API re-checks it server-side regardless.
  const [firstOrder, setFirstOrder] = useState<{ discount: number; minOrder: number } | null>(null);
  useEffect(() => {
    setFirstOrder(null);
    if (!currentUser || !isNativeApp()) return;
    fetch('/api/orders/first-order-eligibility', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.eligible === true) {
          setFirstOrder({
            discount: typeof data.discountAmount === 'number' ? data.discountAmount : 200,
            minOrder: typeof data.minOrderValue === 'number' ? data.minOrderValue : 449,
          });
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Everything the app's floating cart pill shows, already formatted and
  // translated here so the app needs no copy of the strings or pricing rules.
  const total = getTotal();
  useEffect(() => {
    if (!isLoaded) return;
    let hint: string | undefined;
    if (firstOrder && itemCount > 0) {
      const discount = formatCurrency(firstOrder.discount);
      hint = total >= firstOrder.minOrder
        ? t('shellCart.firstOrderApplied', { discount })
        : t('shellCart.firstOrderHint', { amount: formatCurrency(firstOrder.minOrder - total), discount });
    }
    postToNative({
      type: 'CART_COUNT',
      count: itemCount,
      itemsLabel: t('shellCart.items', { count: itemCount }),
      totalLabel: formatCurrency(total),
      hint,
      cta: t('shellCart.viewCart'),
    });
  }, [itemCount, total, isLoaded, firstOrder, locale, t]);

  // Push notifications: once signed in, ask the app for its push token and
  // register it against this account (order status pushes, src/lib/push.ts).
  // App builds without push ignore PUSH_REGISTER, so nothing happens there.
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId || !isNativeApp()) return;
    const onToken = (e: Event) => {
      const token = (e as CustomEvent<{ token?: unknown }>).detail?.token;
      if (typeof token !== 'string') return;
      setPushToken(token);
      fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, locale }),
      }).catch(() => {});
    };
    window.addEventListener('fastget:push-token', onToken);
    postToNative({ type: 'PUSH_REGISTER' });
    return () => window.removeEventListener('fastget:push-token', onToken);
  }, [userId, locale]);

  useEffect(() => {
    if (!isNativeApp()) return;
    const onNavigate = (e: Event) => {
      const path = (e as CustomEvent<{ path?: unknown }>).detail?.path;
      // Same-origin paths only.
      if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
        router.push(path as any);
      }
    };
    window.addEventListener('fastget:navigate', onNavigate);
    return () => window.removeEventListener('fastget:navigate', onNavigate);
  }, [router]);

  return null;

  function defaultTitle(path: string): string {
    const titles: [string, string][] = [
      ['/cart', tc('cart')],
      ['/checkout', t('shellTitles.checkout')],
      ['/catalog', t('shellTitles.products')],
      ['/product/', t('shellTitles.product')],
      ['/wishlist', tc('wishlist')],
      ['/my-profile', t('myProfile')],
      ['/my-addresses', t('myAddresses')],
      ['/my-coins', t('myCoins')],
      ['/refer', t('referAndEarn')],
      ['/support', t('support')],
      ['/order/', t('shellTitles.orderDetails')],
      ['/login', tc('login')],
      ['/signup', tc('signup')],
      ['/forgot-password', t('shellTitles.resetPassword')],
      ['/reset-password', t('shellTitles.resetPassword')],
      ['/verify-reset-otp', t('shellTitles.resetPassword')],
      ['/verify-email', t('shellTitles.verifyEmail')],
      ['/resend-verification', t('shellTitles.verifyEmail')],
      ['/shipping-policy', t('shippingPolicy')],
      ['/refund-policy', t('refundPolicy')],
      ['/privacy-policy', t('privacyPolicy')],
      ['/terms', t('termsOfService')],
    ];
    return titles.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'FastGet';
  }
}
