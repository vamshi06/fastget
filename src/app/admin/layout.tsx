import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Package, ShoppingBag } from 'lucide-react';

export const metadata: Metadata = { title: 'FastGet Admin Panel' };

const navItems = [
  { href: '/admin',          label: 'Dashboard', icon: BarChart3   },
  { href: '/admin/products', label: 'Products',  icon: Package     },
  { href: '/admin/orders',   label: 'Orders',    icon: ShoppingBag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-charcoal text-white flex flex-col flex-shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-black text-sm">
            F
          </div>
          <div>
            <p className="font-bold text-sm">FastGet</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href as any}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Back to Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
