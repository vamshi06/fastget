'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/',           label: 'Home',     Icon: Home          },
  { href: '/categories', label: 'Category', Icon: LayoutGrid    },
  { href: '/my-orders',  label: 'Orders',   Icon: ClipboardList },
  { href: '/account',    label: 'Account',  Icon: User          },
];

const HIDDEN_ROUTES = ['/admin'];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

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
              <Icon
                className={cn('w-5 h-5', isActive && 'stroke-[2.5]')}
              />
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
