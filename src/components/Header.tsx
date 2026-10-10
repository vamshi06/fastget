"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

function CategoryNavRow() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const tCategories = useTranslations("categories");
  const isCategoryActive = (categoryId: string) =>
    pathname === "/catalog" && currentCategory === categoryId;
  return (
    <nav className="hidden md:flex items-center gap-0.5 py-1 border-t border-neutral-100 overflow-x-auto hide-scrollbar">
      {NAV_CATEGORY_IDS.map((id) => (
        <Link
          key={id}
          href={`/catalog?category=${id}`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150",
            "hover:bg-primary-50 hover:text-brand-primary",
            isCategoryActive(id)
              ? "bg-primary-50 text-brand-primary font-semibold"
              : "text-brand-graphite font-medium",
          )}
        >
          {tCategories(`${id}.full`)}
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
  LayoutDashboard,
  Coins,
  Gift,
} from "lucide-react";
import { useWishlist } from "./WishlistContext";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { MobileSearchOverlay } from "./MobileSearchOverlay";
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
  const t = useTranslations("nav");

  if (!loading && results.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 px-4 py-6 text-center text-sm text-brand-slate">
        {t("noResults", { query })}
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
      {loading && results.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-brand-slate">{t("searching")}</div>
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
            {t("seeAllResultsFor", { query })}
          </button>
        </>
      )}
    </div>
  );
}

// Search field hint that cycles through common items ("Search for “Cement”"),
// like the big quick-commerce apps - shows what the catalogue carries.
const HINT_INTERVAL_MS = 2500;

function RotatingSearchHint() {
  const t = useTranslations("nav");
  const terms = t.raw("searchHints") as string[];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % terms.length), HINT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [terms.length]);

  return (
    <span className="truncate">
      <span key={index} className="inline-block animate-ticker">
        {t("searchFor", { term: terms[index] })}
      </span>
    </span>
  );
}

const NAV_CATEGORY_IDS = [
  "tools-machines",
  "carpentry",
  "paints",
  "plumbing",
  "civil-materials",
  "electrical",
  "flooring-ceilings",
  "glass-aluminium",
];

export function Header() {
  const { getItemCount } = useCart();
  const { currentUser, logout } = useUser();
  const { wishlistCount } = useWishlist();
  const { selectedLocation, openSplash } = useLocationSplash();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();

  const itemCount = getItemCount();

  const [scrolled, setScrolled] = useState(false);
  // Mobile: tuck the location/logo row away while scrolling down so only the
  // search bar stays pinned; bring it back on any scroll up.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      // Small dead-zone so tiny finger jitter doesn't flicker the header.
      if (y > lastY + 6 && y > 80) setCollapsed(true);
      else if (y < lastY - 6 || y <= 80) setCollapsed(false);
      if (Math.abs(y - lastY) > 6) lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Never leave the header tucked away on a freshly opened screen.
  useEffect(() => setCollapsed(false), [pathname]);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/coins/balance", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.balance === "number") setCoinBalance(data.balance);
      })
      .catch(() => {});
  }, [currentUser]);

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
          `/api/products?q=${encodeURIComponent(q)}&limit=6&lang=${locale}`,
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
  }, [searchQuery, locale]);

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
        "site-header navbar transition-all duration-200",
        // Phones: a brand-colour block (the app paints the status bar to
        // match on these screens - see mobile WebViewScreen).
        "max-md:bg-gradient-to-b max-md:from-[#F5A623] max-md:to-[#F8B54A] max-md:border-b-0 max-md:backdrop-blur-none",
        scrolled && "shadow-md",
        // 76px = the mobile top row (h-[76px]). Transform doesn't affect
        // layout, so content below never jumps.
        collapsed && !showSuggestions && "max-md:-translate-y-[76px]",
      )}
    >
      {/* ── Mobile Header Row ── (quick-commerce style: delivery time is the
          headline, location under it; language lives in Account) */}
      <div className="md:hidden w-full px-4">
        <div className="flex items-center h-[76px] gap-3">
          {/* Delivery time + location */}
          <button
            onClick={openSplash}
            aria-label={t("changeLocation")}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-charcoal/60 leading-none">
              {t("header.deliveryIn")}
            </p>
            <p className="text-[26px] font-black text-brand-charcoal leading-tight tracking-tight">
              {t("header.eta", { mins: 60 })}
            </p>
            <p className="flex items-center gap-0.5 text-sm font-semibold text-brand-charcoal/85 leading-none">
              <MapPin className="w-3.5 h-3.5 mr-0.5" />
              <span className="truncate">
                {selectedLocation
                  ? (SERVICE_AREAS.find((a) => a.id === selectedLocation)?.name ?? selectedLocation)
                  : tc("selectArea")}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </p>
          </button>

          {/* Right: coins (logged in) + wishlist */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser && (
              <Link
                href={"/my-coins" as any}
                aria-label={t("header.coinsLabel", { count: coinBalance ?? 0 })}
                className="pressable flex items-center gap-1.5 h-10 pl-2 pr-3 rounded-full bg-white/90 shadow-sm"
              >
                <span className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="text-sm font-black text-brand-charcoal">{coinBalance ?? "–"}</span>
              </Link>
            )}
            <Link
              href={"/wishlist" as any}
              aria-label={tc("wishlist")}
              className="pressable relative w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  wishlistCount > 0 ? "fill-red-500 text-red-500" : "text-brand-charcoal",
                )}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#F7AE33]">
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
          "md:hidden w-full px-4 pb-3",
          (pathname.startsWith("/my-orders") ||
            pathname.startsWith("/account")) &&
            "hidden",
        )}
      >
        {/* Looks like a field, opens the full-screen search */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          aria-label={t("searchPlaceholderMobile")}
          className="pressable w-full h-12 flex items-center gap-2.5 px-4 bg-white rounded-xl shadow-sm text-[15px] text-brand-slate text-left"
        >
          <Search className="w-5 h-5 flex-shrink-0 text-brand-charcoal" />
          <RotatingSearchHint />
        </button>
      </div>
      <MobileSearchOverlay open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />

      {/* ── Desktop Main Nav Row ── */}
      <div className="hidden md:block w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src="/fastget-logo-clear.png"
                alt="FastGet Logo"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span className="text-[1.15rem] font-black text-brand-charcoal tracking-tight hidden sm:block">
              Fast<span className="text-brand-primary">Get</span>
            </span>
          </Link>

          {/* Location selector - desktop */}
          <button
            onClick={openSplash}
            aria-label={t("changeLocation")}
            className="hidden md:flex items-center gap-2 shrink-0 group"
          >
            {/* Green badge - matches mobile */}
            <div className="bg-green-700 text-white rounded-lg px-2 py-1 flex flex-col items-center min-w-[46px]">
              <span className="text-[13px] font-black leading-none">~60</span>
              <span className="text-[8px] font-bold leading-none uppercase tracking-wide opacity-90">
                {tc("mins")}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[9px] text-brand-steel uppercase tracking-wide leading-none">
                {tc("deliverTo")}
              </p>
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-semibold text-brand-charcoal leading-none group-hover:text-brand-primary transition-colors">
                  {selectedLocation
                    ? (SERVICE_AREAS.find((a) => a.id === selectedLocation)
                        ?.name ?? selectedLocation)
                    : tc("selectArea")}
                </span>
                <ChevronDown className="w-3 h-3 text-brand-steel" />
              </div>
            </div>
          </button>

          {/* Search Bar - desktop */}
          <form
            onSubmit={handleSearch}
            className="flex-1 min-w-0 hidden md:block"
            data-search-container
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-brand-steel pointer-events-none" />
              <input
                type="text"
                placeholder={t("searchPlaceholderDesktop")}
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
            <LanguageSwitcher />
            <ThemeToggle />
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
              <span className="hidden sm:inline text-sm">{tc("wishlist")}</span>
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
              <span className="hidden sm:inline text-sm">{tc("cart")}</span>
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
                  <span className="ph-no-capture hidden sm:inline text-sm font-medium text-brand-charcoal truncate max-w-[120px]">
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
                    <div className="ph-no-capture px-5 py-4 bg-primary-50 border-b border-neutral-100">
                      <p className="text-sm font-semibold text-brand-charcoal">{currentUser.name}</p>
                      <p className="text-xs text-brand-slate mt-0.5 truncate">{currentUser.email}</p>
                    </div>

                    {/* Admin-only shortcut */}
                    {currentUser.role === 'admin' && (
                      <Link
                        href={'/admin' as any}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-brand-charcoal bg-primary-50/60 hover:bg-primary-50 transition-colors border-b border-neutral-100"
                      >
                        <LayoutDashboard className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        {t("adminDashboard")}
                      </Link>
                    )}

                    {/* Account links */}
                    {[
                      { href: '/my-profile',   label: t('myProfile'),    Icon: User          },
                      { href: '/my-orders',    label: t('orderHistory'), Icon: ClipboardList },
                      { href: '/my-addresses', label: t('myAddresses'),  Icon: MapPin        },
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

                    {/* Coins balance */}
                    <Link
                      href={'/my-coins' as any}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <Coins className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      <span className="flex-1">{t('myCoins')}</span>
                      <span className="text-xs font-bold text-brand-charcoal">{coinBalance ?? '-'}</span>
                    </Link>

                    {/* Refer & Earn */}
                    <Link
                      href={'/refer' as any}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <Gift className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      <span className="flex-1">{t('referAndEarn')}</span>
                      <span className="text-[10px] font-bold text-white bg-brand-primary px-1.5 py-0.5 rounded">₹200</span>
                    </Link>

                    {/* Support */}
                    <Link
                      href={'/support' as any}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <Headphones className="w-4 h-4 text-brand-slate flex-shrink-0" />
                      {t('support')}
                    </Link>

                    {/* Policies accordion */}
                    <button
                      onClick={() => setShowPolicies(p => !p)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-brand-charcoal hover:bg-neutral-50 transition-colors border-b border-neutral-100"
                    >
                      <BookOpen className="w-4 h-4 text-brand-slate flex-shrink-0" />
                      <span className="flex-1 text-left">{t('policies')}</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-brand-steel transition-transform duration-200', showPolicies && 'rotate-180')} />
                    </button>
                    {showPolicies && (
                      <>
                        {[
                          { href: '/shipping-policy', label: t('shippingPolicy'), Icon: Truck     },
                          { href: '/refund-policy',   label: t('refundPolicy'),   Icon: RefreshCw },
                          { href: '/privacy-policy',  label: t('privacyPolicy'),  Icon: Lock      },
                          { href: '/terms',           label: t('termsOfService'), Icon: FileText },
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
                      {tc('signOut')}
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
                  {tc('login')}
                </Link>
                <Link href="/signup" className="btn-primary">
                  {tc('signup')}
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
