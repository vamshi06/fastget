'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCart } from './CartContext';
import { useUser } from './UserContext';
import {
  ShoppingCart, LogOut, User, Search, Menu, X, ChevronDown, MapPin,
} from 'lucide-react';
import { useLocationSplash, SERVICE_AREAS } from './LocationSplashContext';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_CATEGORIES = [
  { id: 'tools-machines',    name: 'Tools & Machines'   },
  { id: 'carpentry',         name: 'Carpentry'          },
  { id: 'paints',            name: 'Paints & Polish'    },
  { id: 'plumbing',          name: 'Plumbing'           },
  { id: 'civil-materials',   name: 'Civil Materials'    },
  { id: 'electrical',        name: 'Electrical'         },
  { id: 'flooring-ceilings', name: 'Flooring & Ceilings' },
  { id: 'glass-aluminium',   name: 'Glass & Aluminium'  },
];

export function Header() {
  const { getItemCount } = useCart();
  const { currentUser, logout } = useUser();
  const { selectedLocation, openSplash } = useLocationSplash();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  const isCategoryActive = (categoryId: string) =>
    pathname === '/catalog' && currentCategory === categoryId;

  const itemCount = getItemCount();

  const [scrolled,      setScrolled]      = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
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

    const res = await fetch('/api/auth/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    if (!res.ok) {
      const result = await res.json();
      console.error('Account deletion failed:', result.error);
      return;
    }

    logout();
    setShowDropdown(false);
    router.push('/');
  };

  return (
    <header className={cn('navbar transition-all duration-200', scrolled && 'shadow-md')}>

      {/* ── Main Nav Row ── */}
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/fastget-logo-clear.png"
                alt="FastGet Logo"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <span className="text-[1.15rem] font-black text-brand-charcoal tracking-tight hidden sm:block">
              Fast<span className="text-brand-primary">Get</span>
            </span>
          </Link>

          {/* Location selector — desktop */}
          <button
            onClick={openSplash}
            aria-label="Change delivery location"
            className={cn(
              'hidden md:flex items-center gap-2 px-3 py-2 rounded-xl shrink-0',
              'border border-neutral-200 hover:border-brand-primary/50 hover:bg-primary-50',
              'transition-all duration-150 group',
            )}
          >
            <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
            <div className="text-left">
              <p className="text-[0.65rem] text-brand-steel leading-none mb-0.5 uppercase tracking-wide font-medium">
                Deliver to
              </p>
              <p className="text-xs font-semibold text-brand-charcoal group-hover:text-brand-primary transition-colors leading-none">
                {selectedLocation
                  ? (SERVICE_AREAS.find(a => a.id === selectedLocation)?.name ?? selectedLocation)
                  : 'Select area'
                }
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-brand-steel flex-shrink-0" />
          </button>

          {/* Search Bar — desktop */}
          <form onSubmit={handleSearch} className="flex-1 min-w-0 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel pointer-events-none" />
              <input
                type="text"
                placeholder="Search for plywood, hinges, fittings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-fog border border-neutral-200 rounded-xl text-sm text-brand-charcoal
                           placeholder:text-brand-steel
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                           transition-all duration-200"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 ml-auto md:ml-0 shrink-0">

            {/* Cart */}
            <Link
              href="/cart"
              className={cn(
                'relative btn-ghost',
                pathname === '/cart' && 'bg-primary-50 text-brand-primary',
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all duration-200"
                  aria-expanded={showDropdown}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shadow-brand">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-brand-charcoal truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <ChevronDown className={cn('w-3 h-3 text-brand-steel hidden sm:block transition-transform duration-150', showDropdown && 'rotate-180')} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-50 animate-fade-in">
                    <div className="px-5 py-4 bg-primary-50 border-b border-neutral-100">
                      <p className="text-sm font-semibold text-brand-charcoal">{currentUser.name}</p>
                      <p className="text-xs text-brand-slate mt-0.5 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-4 text-sm text-brand-charcoal hover:bg-neutral-50 transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4 text-brand-primary" />
                      Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center gap-3 px-5 py-4 text-sm text-red-600 border-t border-neutral-100 hover:bg-red-50 transition-all duration-200"
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
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    pathname === '/login'
                      ? 'bg-primary-50 text-brand-primary'
                      : 'text-brand-charcoal hover:bg-neutral-100',
                  )}
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary">
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
        <nav className="hidden md:flex items-center gap-0.5 py-1 border-t border-neutral-100 overflow-x-auto hide-scrollbar">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150',
              'hover:bg-primary-50 hover:text-brand-primary',
              pathname === '/'
                ? 'bg-primary-50 text-brand-primary font-semibold'
                : 'text-brand-graphite font-medium',
            )}
          >
            Home
          </Link>
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.id}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150',
                'hover:bg-primary-50 hover:text-brand-primary',
                isCategoryActive(cat.id)
                  ? 'bg-primary-50 text-brand-primary font-semibold'
                  : 'text-brand-graphite font-medium',
              )}
            >
              {cat.name}
            </Link>
          ))}
          <Link
            href="/order"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150',
              'hover:bg-primary-50 hover:text-brand-primary',
              pathname === '/order' || pathname.startsWith('/order/')
                ? 'bg-primary-50 text-brand-primary font-semibold'
                : 'text-brand-graphite font-medium',
            )}
          >
            Track Order
          </Link>
        </nav>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 py-4 space-y-4 animate-slide-up">
          {/* Mobile location button */}
          <button
            onClick={() => { openSplash(); setMobileOpen(false); }}
            aria-label="Change delivery location"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200 hover:border-brand-primary/50 hover:bg-primary-50 transition-all duration-150 group"
          >
            <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[0.65rem] text-brand-steel uppercase tracking-wide font-medium leading-none mb-0.5">
                Deliver to
              </p>
              <p className="text-sm font-semibold text-brand-charcoal group-hover:text-brand-primary transition-colors leading-none">
                {selectedLocation
                  ? (SERVICE_AREAS.find(a => a.id === selectedLocation)?.name ?? selectedLocation)
                  : 'Select delivery area'
                }
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-brand-steel flex-shrink-0" />
          </button>

          {/* Mobile search */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel pointer-events-none" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-fog border border-neutral-200 rounded-xl text-sm text-brand-charcoal
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                           transition-all duration-200"
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
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
                  isCategoryActive(cat.id)
                    ? 'bg-primary-50 border-brand-primary'
                    : 'bg-brand-fog hover:bg-primary-50 hover:border-brand-primary border-transparent',
                )}
              >
                <span className={cn(
                  'text-xs font-semibold leading-tight',
                  isCategoryActive(cat.id) ? 'text-brand-primary' : 'text-brand-graphite',
                )}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile auth */}
          {!currentUser && (
            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 btn-secondary text-center">
                Log In
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1 btn-primary text-center">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
