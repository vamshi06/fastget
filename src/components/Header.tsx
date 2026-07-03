"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function CategoryNavRow() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const isCategoryActive = (categoryId: string) =>
    pathname === "/catalog" && currentCategory === categoryId;
  return (
    <nav className="hidden md:flex items-center gap-0.5 py-1 border-t border-neutral-100 overflow-x-auto hide-scrollbar">
      {NAV_CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/catalog?category=${cat.id}`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150",
            "hover:bg-primary-50 hover:text-brand-primary",
            isCategoryActive(cat.id)
              ? "bg-primary-50 text-brand-primary font-semibold"
              : "text-brand-graphite font-medium",
          )}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
import { useCart } from "./CartContext";
import { useUser } from "./UserContext";
import {
  ShoppingCart,
  LogOut,
  User,
  Search,
  ChevronDown,
  ClipboardList,
  Heart,
  MapPin,
  Headphones,
  Truck,
  RefreshCw,
  Lock,
  FileText,
  BookOpen,
} from "lucide-react";
import { useWishlist } from "./WishlistContext";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { useLocationSplash, SERVICE_AREAS } from "./LocationSplashContext";
import { Suspense, useEffect, useRef, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { Product } from "@/types";

const SUGGESTION_MIN_CHARS = 2;
const SUGGESTION_DEBOUNCE_MS = 250;

function SearchSuggestions({
  results,
  loading,
  query,
  onSelect,
  onViewAll,
}: {
  results: Product[];
  loading: boolean;
  query: string;
  onSelect: (product: Product) => void;
  onViewAll: () => void;
}) {
  if (!loading && results.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 px-4 py-6 text-center text-sm text-brand-slate">
        No products found for &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
      {loading && results.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-brand-slate">Searching…</div>
      ) : (
        <>
          <ul className="max-h-80 overflow-y-auto">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelect(product)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 transition-colors"
                >
                  <div className="relative w-9 h-9 rounded-lg bg-brand-fog flex-shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Search className="w-4 h-4 text-brand-steel" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-charcoal truncate">{product.name}</p>
                    <p className="text-xs text-brand-slate">{formatCurrency(product.price)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onViewAll}
            className="w-full px-4 py-3 text-sm font-medium text-brand-primary hover:bg-primary-50 transition-colors border-t border-neutral-100 text-left"
          >
            See all results for &quot;{query}&quot;
          </button>
        </>
      )}
    </div>
  );
}

const NAV_CATEGORIES = [
  { id: "tools-machines", name: "Tools & Machines" },
  { id: "carpentry", name: "Carpentry" },
  { id: "paints", name: "Paints & Polish" },
  { id: "plumbing", name: "Plumbing" },
  { id: "civil-materials", name: "Civil Materials" },
  { id: "electrical", name: "Electrical" },
  { id: "flooring-ceilings", name: "Flooring & Ceilings" },
  { id: "glass-aluminium", name: "Glass & Aluminium" },
];

export function Header() {
  const { getItemCount } = useCart();
  const { currentUser, logout } = useUser();
  const { wishlistCount } = useWishlist();
  const { selectedLocation, openSplash } = useLocationSplash();
  const router = useRouter();
  const pathname = usePathname();

  const itemCount = getItemCount();

  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Debounced live-search: fetch suggestions a couple of letters in, instead
  // of waiting for form submit.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < SUGGESTION_MIN_CHARS) {
      suggestionsAbortRef.current?.abort();
      setSuggestions([]);
      setSuggestionsLoading(false);
      setShowSuggestions(false);
      return;
    }

    setSuggestionsLoading(true);
    const timer = setTimeout(async () => {
      suggestionsAbortRef.current?.abort();
      const ctrl = new AbortController();
      suggestionsAbortRef.current = ctrl;

      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(q)}&limit=6`,
          { signal: ctrl.signal },
        );
        const json = await res.json();
        if (json.success) {
          setSuggestions(json.data.products as Product[]);
          setShowSuggestions(true);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutsideSearch(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-container]")) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions)
      document.addEventListener("mousedown", handleClickOutsideSearch);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, [showSuggestions]);

  const goToSearchResults = (q: string) => {
    if (!q.trim()) return;
    setShowSuggestions(false);
    router.push(`/catalog?q=${encodeURIComponent(q.trim())}` as any);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearchResults(searchQuery);
  };

  const handleSelectSuggestion = (product: Product) => {
    setShowSuggestions(false);
    setSearchQuery("");
    router.push(`/product/${product.id}` as any);
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    router.push("/");
  };

  return (
    <header
      className={cn(
        "navbar transition-all duration-200",
        scrolled && "shadow-md",
      )}
    >
      {/* ── Mobile Header Row ── */}
      <div className="md:hidden w-full px-4 border-b border-neutral-100">
        <div className="flex items-center h-14 gap-2">
          {/* Delivery badge + location */}
          <button
            onClick={openSplash}
            aria-label="Change delivery location"
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="bg-green-700 text-white rounded-lg px-2 py-1 flex flex-col items-center min-w-[46px]">
              <span className="text-[13px] font-black leading-none">~60</span>
              <span className="text-[8px] font-bold leading-none uppercase tracking-wide opacity-90">
                Mins
              </span>
            </div>
            <div className="text-left">
              <p className="text-[9px] text-brand-steel uppercase tracking-wide leading-none">
                Deliver to
              </p>
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-semibold text-brand-charcoal leading-none group-hover:text-brand-primary transition-colors">
                  {selectedLocation
                    ? (SERVICE_AREAS.find((a) => a.id === selectedLocation)
                        ?.name ?? selectedLocation)
                    : "Select area"}
                </span>
                <ChevronDown className="w-3 h-3 text-brand-steel" />
              </div>
            </div>
          </button>

          {/* Center: Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center">
              <div className="relative w-10 h-10">
                <Image
                  src="/fastget-logo-clear.png"
                  alt="FastGet"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Right: Wishlist */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href={"/wishlist" as any}
              aria-label="Wishlist"
              className="relative p-2 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  wishlistCount > 0
                    ? "fill-red-500 text-red-500"
                    : "text-brand-charcoal",
                )}
              />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile Search Row ── */}
      <div
        className={cn(
          "md:hidden w-full px-3 pb-2.5 pt-1 border-b border-neutral-100",
          (pathname.startsWith("/my-orders") ||
            pathname.startsWith("/account")) &&
            "hidden",
        )}
      >
        <form onSubmit={handleSearch} className="relative" data-search-container>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (!pathname.startsWith("/catalog")) router.push("/catalog" as any);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-brand-fog border border-neutral-200 rounded-xl text-sm text-brand-charcoal
                       placeholder:text-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-primary/25
                       focus:border-brand-primary focus:bg-white transition-all"
          />
          {showSuggestions && (
            <SearchSuggestions
              results={suggestions}
              loading={suggestionsLoading}
              query={searchQuery.trim()}
              onSelect={handleSelectSuggestion}
              onViewAll={() => goToSearchResults(searchQuery)}
            />
          )}
        </form>
      </div>

      {/* ── Desktop Main Nav Row ── */}
      <div className="hidden md:block w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
            className="hidden md:flex items-center gap-2 shrink-0 group"
          >
            {/* Green badge — matches mobile */}
            <div className="bg-green-700 text-white rounded-lg px-2 py-1 flex flex-col items-center min-w-[46px]">
              <span className="text-[13px] font-black leading-none">~60</span>
              <span className="text-[8px] font-bold leading-none uppercase tracking-wide opacity-90">
                Mins
              </span>
            </div>
            <div className="text-left">
              <p className="text-[9px] text-brand-steel uppercase tracking-wide leading-none">
                Deliver to
              </p>
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-semibold text-brand-charcoal leading-none group-hover:text-brand-primary transition-colors">
                  {selectedLocation
                    ? (SERVICE_AREAS.find((a) => a.id === selectedLocation)
                        ?.name ?? selectedLocation)
                    : "Select area"}
                </span>
                <ChevronDown className="w-3 h-3 text-brand-steel" />
              </div>
            </div>
          </button>

          {/* Search Bar — desktop */}
          <form
            onSubmit={handleSearch}
            className="flex-1 min-w-0 hidden md:block"
            data-search-container
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-brand-steel pointer-events-none" />
              <input
                type="text"
                placeholder="Search for plywood, hinges, fittings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-11 pr-4 py-3 bg-brand-fog border border-neutral-200 rounded-xl text-sm text-brand-charcoal
                           placeholder:text-brand-steel
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                           transition-all duration-200"
                style={{ fontSize: "14px" }}
              />
              {showSuggestions && (
                <SearchSuggestions
                  results={suggestions}
                  loading={suggestionsLoading}
                  query={searchQuery.trim()}
                  onSelect={handleSelectSuggestion}
                  onViewAll={() => goToSearchResults(searchQuery)}
                />
              )}
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 ml-auto md:ml-0 shrink-0">
            {/* Wishlist */}
            <Link
              href={"/wishlist" as any}
              className={cn(
                "relative btn-ghost",
                pathname === "/wishlist" && "bg-red-50 text-red-500",
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  pathname === "/wishlist" && "fill-red-500 text-red-500",
                )}
              />
              <span className="hidden sm:inline text-sm">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className={cn(
                "relative btn-ghost",
                pathname === "/cart" && "bg-primary-50 text-brand-primary",
              )}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-brand-primary text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-glow">
                  {itemCount > 9 ? "9+" : itemCount}
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
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-brand-steel hidden sm:block transition-transform duration-150",
                      showDropdown && "rotate-180",
                    )}
                  />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-50 animate-fade-in">
                    {/* Profile header */}
                    <div className="px-5 py-4 bg-primary-50 border-b border-neutral-100">
                      <p className="text-sm font-semibold text-brand-charcoal">{currentUser.name}</p>
                      <p className="text-xs text-brand-slate mt-0.5 truncate">{currentUser.email}</p>
                    </div>

                    {/* Account links */}
                    {[
                      { href: '/my-orders',    label: 'Order History', Icon: ClipboardList },
                      { href: '/my-addresses', label: 'My Addresses',  Icon: MapPin        },
                    ].map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href as any}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                      >
                        <Icon className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        {label}
                      </Link>
                    ))}

                    {/* Support */}
                    <Link
                      href={'/support' as any}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <Headphones className="w-4 h-4 text-brand-slate flex-shrink-0" />
                      FastGet Support
                    </Link>

                    {/* Policies accordion */}
                    <button
                      onClick={() => setShowPolicies(p => !p)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <BookOpen className="w-4 h-4 text-brand-slate flex-shrink-0" />
                      <span className="flex-1 text-left">Policies</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-brand-steel transition-transform duration-200', showPolicies && 'rotate-180')} />
                    </button>
                    {showPolicies && (
                      <>
                        {[
                          { href: '/shipping-policy', label: 'Shipping Policy', Icon: Truck     },
                          { href: '/refund-policy',   label: 'Refund Policy',   Icon: RefreshCw },
                          { href: '/privacy-policy',  label: 'Privacy Policy',  Icon: Lock      },
                          { href: '/terms',           label: 'Terms of Service', Icon: FileText },
                        ].map(({ href, label, Icon }) => (
                          <Link
                            key={href}
                            href={href as any}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 pl-10 pr-5 py-3 text-sm text-brand-slate hover:bg-neutral-50 hover:text-brand-charcoal transition-colors border-b border-neutral-100"
                          >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            {label}
                          </Link>
                        ))}
                      </>
                    )}

                    {/* Sign out */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 border-b border-neutral-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      Sign Out
                    </button>

                    {/* Delete account */}
                    <DeleteAccountButton variant="dropdown" />
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                    pathname === "/login"
                      ? "bg-primary-50 text-brand-primary"
                      : "text-brand-charcoal hover:bg-neutral-100",
                  )}
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Nav Row (desktop) ── */}
        <Suspense fallback={<nav className="hidden md:flex h-8 border-t border-neutral-100" />}>
          <CategoryNavRow />
        </Suspense>
      </div>
    </header>
  );
}
