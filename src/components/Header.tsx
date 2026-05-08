'use client';

import Link from 'next/link';

import {
  useRouter,
  usePathname,
} from 'next/navigation';

import { useCart } from './CartContext';

import {
  ShoppingCart,
  Package,
  LogOut,
  User,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export function Header() {
  const { getItemCount } = useCart();

  const router = useRouter();
  const pathname = usePathname();

  const [itemCount, setItemCount] =
    useState(0);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(
      null
    );

  const [showDropdown, setShowDropdown] =
    useState(false);

  useEffect(() => {
    setItemCount(getItemCount());

    // Load user from localStorage
    const user =
      localStorage.getItem(
        'fastget_currentUser'
      );

    if (user) {
      setCurrentUser(
        JSON.parse(user)
      );
    }
  }, [getItemCount]);

  const handleLogout = () => {
    localStorage.removeItem(
      'fastget_currentUser'
    );

    setCurrentUser(null);

    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-blue-100 shadow-sm">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-md">

              <Package className="w-5 h-5 text-white" />
            </div>

            <div className="flex flex-col leading-none">

              <span className="text-xl font-bold tracking-tight text-gray-900">
                Fastget
              </span>

              <span className="text-[11px] text-blue-600 font-medium">
                Quick Materials
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">

            <Link
              href="/"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname === '/'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              Home
            </Link>

            <Link
              href="/catalog"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname ===
                '/catalog'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              Products
            </Link>

            <Link
              href="/order"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname ===
                '/order'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              Track Order
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">

            {/* Cart */}
            <Link
              href="/cart"
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                pathname ===
                '/cart'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-blue-50 text-gray-700'
              }`}
            >
              <ShoppingCart
                className={`w-5 h-5 ${
                  pathname ===
                  '/cart'
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              />

              <span className="hidden sm:inline font-medium text-sm">
                Cart
              </span>

              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">

                  {itemCount > 9
                    ? '9+'
                    : itemCount}
                </span>
              )}
            </Link>

            {/* Logged In */}
            {currentUser ? (

              <div className="relative">

                <button
                  onClick={() =>
                    setShowDropdown(
                      !showDropdown
                    )
                  }
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50 transition-all duration-200"
                >

                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">

                    <User className="w-4 h-4 text-white" />
                  </div>

                  <span className="hidden sm:inline text-sm font-medium text-gray-700 truncate max-w-[120px]">
                    {
                      currentUser.name
                    }
                  </span>
                </button>

                {/* Dropdown */}
                {showDropdown && (

                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* User Info */}
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">

                      <p className="text-sm font-semibold text-gray-900">
                        {
                          currentUser.name
                        }
                      </p>

                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {
                          currentUser.email
                        }
                      </p>
                    </div>

                    {/* Logout */}
                    <button
                      onClick={
                        handleLogout
                      }
                      className="w-full flex items-center gap-3 px-5 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200"
                    >

                      <LogOut className="w-4 h-4 text-blue-600" />

                      Sign Out
                    </button>
                  </div>
                )}
              </div>

            ) : (

              <div className="flex items-center gap-2">

                {/* Login */}
                <Link
                  href="/login"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pathname ===
                    '/login'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  Log In
                </Link>

                {/* Signup */}
                <Link
                  href="/signup"
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm ${
                    pathname ===
                    '/signup'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}