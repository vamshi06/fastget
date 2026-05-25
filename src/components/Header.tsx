'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from './CartContext';
import { useUser } from './UserContext';
import {
  ShoppingCart, LogOut, User, Search, Menu, X, ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_CATEGORIES = [
  { id: 'carpentry',  name: 'Carpentry',  icon: '🔨' },
  { id: 'plumbing',   name: 'Plumbing',   icon: '🔧' },
  { id: 'hardware',   name: 'Hardware',   icon: '⚙️' },
  { id: 'electrical', name: 'Electrical', icon: '⚡' },
  { id: 'adhesives',  name: 'Adhesives',  icon: '🧴' },
];

export function Header() {
  const { getItemCount } = useCart();
  const { currentUser, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const itemCount = getItemCount();

  const [scrolled, setScrolled]         = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;

    const response = await fetch('/api/auth/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Account deletion failed:', result.error);
      return;
    }

    logout();
    setShowDropdown(false);
    router.push('/');
  };

  return (
    <header className={cn('navbar transition-shadow duration-200', scrolled && 'shadow-md')}>
      {/* ── Main Nav Row ── */}
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/fastget-logo-clear.png"
                alt="FastGet Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-black text-brand-charcoal tracking-tight hidden sm:block">
              Fast<span className="text-brand-primary">Get</span>
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 min-w-0 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for plywood, hinges, fittings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">

            {/* Cart */}
            <Link
              href="/cart"
              className={cn(
                'relative btn-ghost',
                pathname === '/cart' && 'bg-orange-50 text-brand-primary',
              )}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-brand-primary text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-glow">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  aria-expanded={showDropdown}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-brand-charcoal truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-5 py-4 bg-orange-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-brand-charcoal">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-4 text-sm text-brand-charcoal hover:bg-gray-50 transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4 text-brand-primary" />
                      Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center gap-3 px-5 py-4 text-sm text-red-600 border-t border-gray-100 hover:bg-red-50 transition-all duration-200"
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    pathname === '/login'
                      ? 'bg-orange-50 text-brand-primary'
                      : 'text-brand-charcoal hover:bg-gray-100',
                  )}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn-ghost"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Category Nav Row (desktop) ── */}
        <nav className="hidden md:flex items-center gap-1 py-1 border-t border-gray-100 overflow-x-auto hide-scrollbar">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150',
              'hover:bg-orange-50 hover:text-brand-primary',
              pathname === '/' ? 'bg-orange-50 text-brand-primary' : 'text-gray-700',
            )}
          >
            Home
          </Link>
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.id}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150',
                'hover:bg-orange-50 hover:text-brand-primary text-gray-700',
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
          <Link
            href="/order"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150',
              'hover:bg-orange-50 hover:text-brand-primary',
              pathname === '/order' ? 'bg-orange-50 text-brand-primary' : 'text-gray-700',
            )}
          >
            Track Order
          </Link>
        </nav>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-4 animate-slide-up">
          {/* Mobile search */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </form>

          {/* Mobile category grid */}
          <div className="grid grid-cols-3 gap-2">
            {NAV_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${cat.id}`}
                onClick={() => setMobileOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 text-center transition-colors"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-brand-charcoal leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>

          {/* Mobile auth links */}
          {!currentUser && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 btn-secondary text-center"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 btn-primary text-center"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
