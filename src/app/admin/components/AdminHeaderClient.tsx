'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export function AdminHeaderClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const isDashboard = pathname === '/admin';
  const isOrders = pathname.startsWith('/admin/orders');
  const isProducts = pathname.startsWith('/admin/products');

  return (
    <header className="bg-white border-b border-neutral-100 shadow-sm sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="group">
            <h1 className="text-2xl font-black text-brand-charcoal group-hover:text-brand-primary transition-colors duration-200">
              FastGet <span className="text-brand-primary">Admin</span>
            </h1>
          </Link>
          <nav className="flex gap-6">
            {[
              { label: 'Dashboard', href: '/admin', active: isDashboard },
              { label: 'Orders', href: '/admin/orders', active: isOrders },
              { label: 'Products', href: '/admin/products', active: isProducts },
            ].map(({ label, href, active }) => (
              <Link
                key={label}
                href={href as any}
                className={`font-medium transition-all duration-200 relative group text-sm ${
                  active ? 'text-brand-primary' : 'text-brand-slate hover:text-brand-primary'
                }`}
              >
                {label}
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-brand-primary group-hover:w-full transition-all duration-300 ${
                    active ? 'w-full' : 'w-0'
                  }`}
                />
              </Link>
            ))}
          </nav>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="px-4 py-2 text-brand-slate hover:text-brand-charcoal hover:bg-primary-50 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            Logout
          </button>
          {showLogout && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-10 border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200 rounded-xl text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
