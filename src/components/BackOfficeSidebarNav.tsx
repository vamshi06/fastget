'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Package, ShoppingBag, Star, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin',           label: 'Dashboard',       icon: BarChart3   },
  { href: '/admin/products',  label: 'Products',        icon: Package     },
  { href: '/admin/orders',    label: 'Orders',          icon: ShoppingBag },
  { href: '/admin/reviews',   label: 'Reviews',         icon: Star        },
  { href: '/agent-dashboard', label: 'Agent Dashboard', icon: Truck       },
];

// Shared sidebar nav for both the admin panel and the agent panel, so either
// staff surface can navigate to the other without a dead end.
export function BackOfficeSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/admin'
          ? pathname === href
          : href === '/agent-dashboard'
            ? pathname.startsWith('/agent-dashboard') || pathname.startsWith('/agent/')
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as any}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-brand-primary text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
