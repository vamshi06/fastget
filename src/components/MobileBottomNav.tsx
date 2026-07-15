'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Home, LayoutGrid, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/CartContext';

const SIDE_TABS = [
  { href: '/',           label: 'Home',     Icon: Home          },
  { href: '/categories', label: 'Category', Icon: LayoutGrid    },
  { href: '/my-orders',  label: 'Orders',   Icon: ClipboardList },
  { href: '/account',    label: 'Account',  Icon: User          },
];

const HIDDEN_ROUTES = ['/admin'];

// Fixed-position elements get pushed up above the on-screen keyboard on
// mobile browsers (the viewport resizes, "bottom: 0" lands above the keyboard
// instead of off-screen). Rather than inferring "keyboard open" from focus
// (a field can stay focused after the keyboard is dismissed via the back
// button/gesture, leaving the nav stuck hidden), measure the actual visual
// viewport — it reliably reports back to full height once the keyboard closes.
function useKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // Keyboard is open when the visual viewport is meaningfully shorter
      // than the layout viewport it's inset into.
      setIsOpen(vv.height < window.innerHeight * 0.75);
    };

    vv.addEventListener('resize', handleResize);
    handleResize();
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  return isOpen;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isKeyboardOpen = useKeyboardOpen();
  const isHiddenRoute = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  const isVisible = !isHiddenRoute && !isKeyboardOpen;
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const isCartActive = pathname.startsWith('/cart');

  // Delay rendering until after client hydration so the server output (null)
  // matches the initial client output (null), eliminating hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Restart the CSS animation on the cart circle every time an item is added.
  // prevCountRef starts as null so the first render after mount never animates.
  const cartCircleRef = useRef<HTMLSpanElement>(null);
  const prevCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevCountRef.current !== null && itemCount > prevCountRef.current && cartCircleRef.current) {
      const el = cartCircleRef.current;
      el.classList.remove('animate-cart-pop');
      void el.offsetWidth; // force reflow so removing + re-adding the class restarts the animation
      el.classList.add('animate-cart-pop');
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  // Keep the space `main` reserves for this nav (--bottom-nav-space, set in
  // globals.css) in sync with whether the nav is actually rendered, so
  // hiding it doesn't leave a dangling empty gap. Remove (rather than zero)
  // the override when visible so desktop's media-query default still wins.
  useEffect(() => {
    if (isVisible) {
      document.documentElement.style.removeProperty('--bottom-nav-space');
    } else {
      document.documentElement.style.setProperty('--bottom-nav-space', '0px');
    }
    return () => { document.documentElement.style.removeProperty('--bottom-nav-space'); };
  }, [isVisible]);

  if (!mounted || !isVisible) return null;

  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200">
      <div className="flex items-stretch h-16 safe-area-inset-bottom">
        {/* Left two tabs */}
        {leftTabs.map(({ href, label, Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-brand-primary' : 'text-brand-steel'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span
                className={cn(
                  'text-[10px]',
                  isActive ? 'font-semibold text-brand-primary' : 'font-medium text-brand-steel'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* Centre cart button — elevated above the nav bar */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2 relative">
          <Link
            href={'/cart' as any}
            className="flex flex-col items-center gap-0.5 -translate-y-3"
          >
            <span className="relative">
              <span
                ref={cartCircleRef}
                className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-brand-primary"
              >
                <ShoppingCart className="w-6 h-6 text-white stroke-[2]" />
              </span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-[10px]',
                isCartActive ? 'font-semibold text-brand-primary' : 'font-medium text-brand-steel'
              )}
            >
              Cart
            </span>
          </Link>
        </div>

        {/* Right two tabs */}
        {rightTabs.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-brand-primary' : 'text-brand-steel'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span
                className={cn(
                  'text-[10px]',
                  isActive ? 'font-semibold text-brand-primary' : 'font-medium text-brand-steel'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
