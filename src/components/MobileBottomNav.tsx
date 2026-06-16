'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, LayoutGrid, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
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
    return () => document.documentElement.style.removeProperty('--bottom-nav-space');
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200">
      <div className="flex items-stretch h-16 safe-area-inset-bottom">
        {TABS.map(({ href, label, Icon }) => {
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
      </div>
    </nav>
  );
}
