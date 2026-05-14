'use client';

import Link from 'next/link';
import { useCart } from './CartContext';
import { ShoppingCart, Package } from 'lucide-react';

export function Header() {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Fastget</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
              Home
            </Link>
            <Link href="/catalog" className="text-gray-600 hover:text-gray-900 font-medium">
              Products
            </Link>
            <Link href="/order" className="text-gray-600 hover:text-gray-900 font-medium">
              Track Order
            </Link>
          </nav>

          <Link
            href="/cart"
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="hidden sm:inline text-gray-600 font-medium">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
