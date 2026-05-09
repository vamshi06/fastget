'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const token = searchParams.get('token');
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    router.push('/');
  };

  const isDashboard = pathname === '/admin';
  const isOrders = pathname.startsWith('/admin/orders');
  const isProducts = pathname.startsWith('/admin/products');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={`/admin${token ? `?token=${token}` : ''}`} className="group">
              {/* <Image
                            src="/fastget-logo.png"
                            alt="Fastget Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10"
                          /> */}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-200">
                FastGet Admin
              </h1>
            </Link>
            <nav className="flex gap-6">
              <Link
                href={`/admin${token ? `?token=${token}` : ''}`}
                className={`font-medium transition-all duration-200 relative group ${
                  isDashboard
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Dashboard
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 ${
                    isDashboard ? 'w-full' : 'w-0'
                  }`}
                />
              </Link>
              <Link
                href={`/admin/orders${token ? `?token=${token}` : ''}`}
                className={`font-medium transition-all duration-200 relative group ${
                  isOrders
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Orders
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 ${
                    isOrders ? 'w-full' : 'w-0'
                  }`}
                />
              </Link>
              <Link
                href={`/admin/products${token ? `?token=${token}` : ''}`}
                className={`font-medium transition-all duration-200 relative group ${
                  isProducts
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Products
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 ${
                    isProducts ? 'w-full' : 'w-0'
                  }`}
                />
              </Link>
            </nav>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
            >
              Logout
            </button>
            {showLogout && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
              >
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
