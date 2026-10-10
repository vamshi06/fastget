'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types';
import {
  Package, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, X, Loader2, ArrowUpDown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsPhone, useLockBodyScroll } from '@/lib/use-back-to-close';
import { useNativeBackHandler, useNativeTitle } from '@/lib/native-bridge';
import { getSubcategoryTiles } from '@/lib/category-tiles';
import type { CatalogSort } from '@/lib/products';
import { ProductCardSkeleton } from '@/components/Skeletons';
import { track } from '@/lib/analytics';

// ── DB category definitions ────────────────────────────────────────────────────

// One entry per category table - no sub-categories.
const DB_CATEGORIES = [
  { slug: 'tools-machines',    name: 'Tools & Machines'    },
  { slug: 'carpentry',         name: 'Carpentry'           },
  { slug: 'paints',            name: 'Paints & Polish'     },
  { slug: 'plumbing',          name: 'Plumbing'            },
  { slug: 'civil-materials',   name: 'Civil Materials'     },
  { slug: 'electrical',        name: 'Electrical'          },
  { slug: 'flooring-ceilings', name: 'Flooring & Ceilings' },
  { slug: 'glass-aluminium',   name: 'Glass & Aluminium'   },
] as const;

const PAGE_SIZE = 24;
const SORTS: CatalogSort[] = ['relevance', 'price_asc', 'price_desc', 'discount'];
// Short form on the compact Sort button ("Sort" until one is chosen).
const SORT_SHORT_KEYS: Record<CatalogSort, string> = {
  relevance:  'sortShortRelevance',
  price_asc:  'sortShortPriceAsc',
  price_desc: 'sortShortPriceDesc',
  discount:   'sortShortDiscount',
};
const SORT_LABEL_KEYS: Record<CatalogSort, string> = {
  relevance:  'sortRecommended',
  price_asc:  'sortPriceLowHigh',
  price_desc: 'sortPriceHighLow',
  discount:   'sortDiscountHighLow',
};

function parseSort(raw: string | null): CatalogSort {
  return SORTS.includes(raw as CatalogSort) ? (raw as CatalogSort) : 'relevance';
}

/** Everything that decides which products the catalog shows - mirrored in the URL. */
interface CatalogFilters {
  cat: string;
  q: string;
  sub: string;   // sub-category tile key (category-tiles.ts)
  page: number;
  minP: number;
  maxP: number;
  sort: CatalogSort;
}
const MAX_PRICE = 50000; // ₹50k covers the full construction materials range

// ── Pagination range helper ───────────────────────────────────────────────────

function paginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const left  = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  const range: (number | '...')[] = [1];

  if (left > 2)       range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  range.push(total);

  return range;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

// Same shape as the compact ProductCard the grid renders.
const SkeletonCard = ProductCardSkeleton;

// ── Main catalog content ──────────────────────────────────────────────────────

function CatalogPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const t            = useTranslations('catalog');
  const tCategories   = useTranslations('categories');
  const tc            = useTranslations('common');
  const locale        = useLocale();

  // ── Read initial state from URL ───────────────────────────────────────────
  const initialCategory = searchParams.get('category')  || '';
  const initialQuery    = searchParams.get('q')          || '';
  const initialPage     = Math.max(1, parseInt(searchParams.get('page')      || '1',              10));
  const initialMinPrice = Math.max(0, parseInt(searchParams.get('min_price') || '0',              10));
  const initialMaxPrice = Math.min(MAX_PRICE, parseInt(searchParams.get('max_price') || String(MAX_PRICE), 10));
  const initialSub      = searchParams.get('sub')        || '';
  const initialSort     = parseSort(searchParams.get('sort'));

  // ── State ────────────────────────────────────────────────────────────────
  const [products,      setProducts]      = useState<Product[]>([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery,    setSearchQuery]    = useState(initialQuery);
  const [activeSub,      setActiveSub]      = useState(initialSub);
  const [sort,           setSort]           = useState<CatalogSort>(initialSort);
  const [showFilters,    setShowFilters]    = useState(false);
  const [sortOpen,       setSortOpen]       = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  // Sort menu: close on a tap outside it, and on the app's Back button.
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!sortMenuRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [sortOpen]);
  useNativeBackHandler(sortOpen, () => setSortOpen(false));
  const isPhone = useIsPhone();
  // On phones the filter panel is a bottom sheet; keep the list behind it still.
  useLockBodyScroll((showFilters || sortOpen) && isPhone);
  // Android app: hardware Back closes the sheet rather than leaving the catalog.
  useNativeBackHandler(showFilters, () => setShowFilters(false));
  const [currentPage,    setCurrentPage]    = useState(initialPage);
  // Phones scroll endlessly instead of paging: further pages are appended as
  // the user nears the end. loadedPage = last page appended so far.
  const [loadedPage,     setLoadedPage]     = useState(initialPage);
  const [loadingMore,    setLoadingMore]    = useState(false);

  // Price display state (updates on every slider drag) vs active filter state
  // (updates on mouseup - triggers API refetch)
  const [dispMin,   setDispMin]   = useState(initialMinPrice);
  const [dispMax,   setDispMax]   = useState(initialMaxPrice);
  const [activeMin, setActiveMin] = useState(initialMinPrice);
  const [activeMax, setActiveMax] = useState(initialMaxPrice);

  const abortRef = useRef<AbortController | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);

  const apiParams = useCallback((f: CatalogFilters) => {
    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String((f.page - 1) * PAGE_SIZE),
      lang:   locale,
    });
    if (f.cat)              params.set('category',  f.cat);
    if (f.cat && f.sub)     params.set('sub',       f.sub);
    if (f.q)                params.set('q',         f.q);
    if (f.minP > 0)         params.set('min_price', String(f.minP));
    if (f.maxP < MAX_PRICE) params.set('max_price', String(f.maxP));
    if (f.sort !== 'relevance') params.set('sort', f.sort);
    return params;
  }, [locale]);

  const currentFilters = (): CatalogFilters => ({
    cat: activeCategory, q: searchQuery, sub: activeSub, page: currentPage,
    minP: activeMin, maxP: activeMax, sort,
  });

  // ── Fetch from API ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (f: CatalogFilters) => {
    if (abortRef.current) abortRef.current.abort();
    moreAbortRef.current?.abort(); // a filter change supersedes any "load more"
    setLoadingMore(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const params = apiParams(f);
      const res  = await fetch(`/api/products?${params}`, { signal: ctrl.signal });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Unknown error');

      setProducts(json.data.products as Product[]);
      setTotal(json.data.total);
      // Searches with 0 results show what customers want that we don't stock.
      if (f.q && f.page === 1) track('searched', { query: f.q, results: json.data.total, category: f.cat || undefined });
      setTotalPages(Math.max(1, Math.ceil(json.data.total / PAGE_SIZE)));
      setLoadedPage(f.page);
      setLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(t('errorLoadingProducts'));
      setLoading(false);
    }
  }, [t, apiParams]);

  // Phones: append the next page (endless scroll). Desktop keeps pagination.
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || loadedPage >= totalPages) return;
    const ctrl = new AbortController();
    moreAbortRef.current = ctrl;
    setLoadingMore(true);
    try {
      const next = loadedPage + 1;
      const res = await fetch(`/api/products?${apiParams({ ...currentFilters(), page: next })}`, { signal: ctrl.signal });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...(json.data.products as Product[]).filter((p) => !seen.has(p.id))];
      });
      setLoadedPage(next);
      setLoadingMore(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, loadedPage, totalPages, apiParams, activeCategory, searchQuery, activeSub, activeMin, activeMax, sort]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!isPhone || !el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '600px 0px' }, // start well before the end, so it feels endless
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPhone, loadMore]);

  // Refetch whenever filter state (or the language) changes
  useEffect(() => {
    fetchProducts(currentFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery, activeSub, currentPage, activeMin, activeMax, sort, locale]);

  // Sync URL → state on browser back/forward
  useEffect(() => {
    const q    = searchParams.get('q')          || '';
    const cat  = searchParams.get('category')   || '';
    const page = Math.max(1, parseInt(searchParams.get('page')      || '1',              10));
    const minP = Math.max(0, parseInt(searchParams.get('min_price') || '0',              10));
    const maxP = Math.min(MAX_PRICE, parseInt(searchParams.get('max_price') || String(MAX_PRICE), 10));
    setSearchQuery(q);
    setActiveCategory(cat);
    setActiveSub(searchParams.get('sub') || '');
    setSort(parseSort(searchParams.get('sort')));
    setCurrentPage(page);
    setActiveMin(minP); setDispMin(minP);
    setActiveMax(maxP); setDispMax(maxP);
  }, [searchParams]);

  // ── URL builder ───────────────────────────────────────────────────────────
  // Current filters with `changes` applied, as a /catalog URL.
  const buildUrl = (changes: Partial<CatalogFilters>) => {
    const f = { ...currentFilters(), ...changes };
    const p = new URLSearchParams();
    if (f.cat)              p.set('category',  f.cat);
    if (f.cat && f.sub)     p.set('sub',       f.sub);
    if (f.q)                p.set('q',         f.q);
    if (f.page > 1)         p.set('page',      String(f.page));
    if (f.minP > 0)         p.set('min_price', String(f.minP));
    if (f.maxP < MAX_PRICE) p.set('max_price', String(f.maxP));
    if (f.sort !== 'relevance') p.set('sort', f.sort);
    const qs = p.toString();
    // Cast needed: typedRoutes strict check doesn't cover dynamic catalog URLs
    return `/catalog${qs ? '?' + qs : ''}` as any;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setActiveCategory('');
    setActiveSub('');
    setCurrentPage(1);
    router.replace(buildUrl({ cat: '', sub: '', q, page: 1 }), { scroll: false });
  };

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    setSearchQuery('');
    setActiveSub('');
    setCurrentPage(1);
    router.replace(buildUrl({ cat: slug, q: '', sub: '', page: 1 }), { scroll: false });
  };

  // Sub-category chip: same category, narrowed to one tile ('' = all).
  const handleSubFilter = (tileKey: string) => {
    if (tileKey === activeSub && !searchQuery) return;
    setActiveSub(tileKey);
    setSearchQuery('');
    setCurrentPage(1);
    window.scrollTo({ top: 0 });
    router.replace(buildUrl({ sub: tileKey, q: '', page: 1 }), { scroll: false });
  };

  const handleSortChange = (next: CatalogSort) => {
    setSort(next);
    setCurrentPage(1);
    router.replace(buildUrl({ sort: next, page: 1 }), { scroll: false });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.replace(buildUrl({ page }), { scroll: false });
  };

  // Called on slider mouseup/touchend - commits display state to active filter
  const applyPriceFilter = () => {
    setActiveMin(dispMin);
    setActiveMax(dispMax);
    setCurrentPage(1);
    router.replace(buildUrl({ page: 1, minP: dispMin, maxP: dispMax }), { scroll: false });
  };

  const resetPriceDisplay = () => {
    setDispMin(0);
    setDispMax(MAX_PRICE);
  };

  const resetFilters = () => {
    setActiveCategory('');
    setSearchQuery('');
    setActiveSub('');
    setSort('relevance');
    setCurrentPage(1);
    setDispMin(0);   setDispMax(MAX_PRICE);
    setActiveMin(0); setActiveMax(MAX_PRICE);
    router.replace('/catalog', { scroll: false });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const pages            = paginationRange(currentPage, totalPages);
  const activeCategoryName = DB_CATEGORIES.find((c) => c.slug === activeCategory)
    ? tCategories(`${activeCategory}.full`)
    : null;
  const isPriceFiltered  = activeMin > 0 || activeMax < MAX_PRICE;
  const rangeStart       = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd         = Math.min(currentPage * PAGE_SIZE, total);

  // Sub-category chips for the active category (from the Categories page tiles).
  const subTiles        = activeCategory ? getSubcategoryTiles(activeCategory) : [];
  const activeSubTile   = subTiles.find((tile) => tile.tileKey === activeSub);

  // App top bar: the sub-category, search or category being browsed.
  useNativeTitle(
    activeSubTile ? t(`categoryTiles.${activeSubTile.tileKey}`)
      : searchQuery ? `“${searchQuery}”`
      : activeCategoryName,
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-fog">

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">

        {/* Toolbar - result count left, compact Sort + Filters buttons right */}
        <div className="flex items-center justify-between gap-2 mb-3 md:gap-3 md:mb-6">
          <div className="min-w-0 text-[13px] md:text-[15px] text-brand-slate leading-snug">
            {loading ? (
              <p>{t('loadingProducts')}</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : searchQuery && !activeSubTile ? (
              <p>{t('resultsFor', { count: total, query: searchQuery })}</p>
            ) : activeCategoryName ? (
              <p>
                {total === 0
                  ? t('noProductsInCategory', { category: activeCategoryName })
                  // Page ranges mean nothing with endless scroll on phones.
                  : isPhone
                    ? t('productsFoundCount', { count: total })
                    : t('showingRange', { start: rangeStart, end: rangeEnd, total, category: activeCategoryName })}
              </p>
            ) : (
              <p>{total > 0 ? t('productsAvailable', { count: total }) : t('noProductsFound')}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
          {/* Compact Sort button + our own small dropdown (the phone's native
              select picker is a big full-width dialog we can't style). */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-label={t('sort')}
              className={cn(
                'pressable h-9 md:h-11 px-3 md:px-4 bg-white border rounded-xl text-[13px] md:text-[14px] font-medium flex items-center gap-1.5 shadow-sm hover:border-brand-primary',
                sort === 'relevance' ? 'border-neutral-200 text-brand-charcoal' : 'border-brand-primary text-brand-primary bg-primary-50',
              )}
            >
              <ArrowUpDown className="w-4 h-4 text-brand-primary" />
              {t(SORT_SHORT_KEYS[sort])}
            </button>
            {/* Phones: a bottom sheet styled like the Filters sheet.
                Larger screens: a small dropdown under the button. */}
            {sortOpen && isPhone && (
              <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label={t('sortTitle')}>
                <div className="absolute inset-0 bg-black/50 animate-screen-in" onClick={() => setSortOpen(false)} />
                <div className="relative w-full bg-white rounded-t-3xl overflow-hidden shadow-sm animate-sheet-up motion-reduce:animate-none pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="flex justify-center pt-2.5 -mb-1">
                    <span className="w-10 h-1 rounded-full bg-neutral-300" />
                  </div>
                  <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
                    <div>
                      <h2 className="text-[18px] font-bold text-brand-charcoal">{t('sortTitle')}</h2>
                      <p className="text-[13px] text-brand-slate mt-1">{t('sortSubtitle')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSortOpen(false)}
                      aria-label={tc('close')}
                      className="w-10 h-10 rounded-xl hover:bg-primary-100 flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4 text-brand-graphite" />
                    </button>
                  </div>
                  <div role="radiogroup" className="px-4 py-2">
                    {SORTS.map((key) => {
                      const active = sort === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => { setSortOpen(false); if (!active) handleSortChange(key); }}
                          className={cn(
                            'pressable w-full flex items-center justify-between gap-3 px-2 py-3.5 text-[15px] text-left border-b border-neutral-100 last:border-0',
                            active ? 'font-semibold text-brand-charcoal' : 'text-brand-graphite',
                          )}
                        >
                          {t(SORT_LABEL_KEYS[key])}
                          <span className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            active ? 'border-brand-primary' : 'border-neutral-300',
                          )}>
                            {active && <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {sortOpen && !isPhone && (
              <ul
                role="menu"
                className="absolute right-0 top-full mt-1.5 z-30 w-56 py-1 bg-white border border-neutral-200 rounded-xl shadow-lg animate-fade-in"
              >
                {SORTS.map((key) => (
                  <li key={key} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={sort === key}
                      onClick={() => { setSortOpen(false); if (key !== sort) handleSortChange(key); }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-left hover:bg-primary-50',
                        sort === key ? 'font-semibold text-brand-primary' : 'text-brand-charcoal',
                      )}
                    >
                      {t(SORT_LABEL_KEYS[key])}
                      {sort === key && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="pressable shrink-0 h-9 md:h-11 px-3 md:px-5 bg-white border border-neutral-200 rounded-xl text-[13px] md:text-[14px] font-medium text-brand-charcoal hover:border-brand-primary hover:bg-primary-50 flex items-center gap-1.5 md:gap-2 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
            {t('filters')}
            {isPriceFiltered && (
              <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />
            )}
            <ChevronDown className={`hidden md:block w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          </div>
        </div>

        {/* Quick chips: sub-categories inside a category, or the categories
            themselves when browsing everything. Scrolls sideways on phones. */}
        {(subTiles.length > 0 || (!activeCategory && !searchQuery)) && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4 md:mx-0 md:px-0 md:flex-wrap md:mb-6">
            {(subTiles.length > 0
              ? [
                  { key: 'all', label: t('chipAll'), active: !activeSub && !searchQuery, onClick: () => handleSubFilter('') },
                  ...subTiles.map((tile) => ({
                    key: tile.tileKey,
                    label: t(`categoryTiles.${tile.tileKey}`),
                    active: activeSub === tile.tileKey && !searchQuery,
                    onClick: () => handleSubFilter(tile.tileKey),
                  })),
                ]
              : [
                  { key: 'all', label: t('allProducts'), active: true, onClick: () => {} },
                  ...DB_CATEGORIES.map((cat) => ({
                    key: cat.slug,
                    label: tCategories(`${cat.slug}.full`),
                    active: false,
                    onClick: () => handleCategoryChange(cat.slug),
                  })),
                ]
            ).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClick}
                aria-pressed={chip.active}
                className={cn(
                  'pressable shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors',
                  chip.active
                    ? 'bg-brand-charcoal text-white border-brand-charcoal'
                    : 'bg-white text-brand-graphite border-neutral-200 hover:border-brand-primary',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter panel - inline on larger screens, a bottom sheet on phones */}
        {showFilters && (
          <div className="max-md:fixed max-md:inset-0 max-md:z-[60] max-md:flex max-md:items-end">
          <div
            className="md:hidden absolute inset-0 bg-black/50 animate-screen-in"
            onClick={() => setShowFilters(false)}
          />
          <div className="relative w-full mb-10 bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm max-md:mb-0 max-md:max-h-[85vh] max-md:overflow-y-auto max-md:overscroll-contain max-md:rounded-b-none max-md:border-0 max-md:animate-sheet-up motion-reduce:animate-none">

            {/* Drag-handle affordance (phones) */}
            <div className="md:hidden flex justify-center pt-2.5 -mb-1">
              <span className="w-10 h-1 rounded-full bg-neutral-300" />
            </div>

            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
              <div>
                <h2 className="text-[18px] font-bold text-brand-charcoal">{t('filters')}</h2>
                <p className="text-[13px] text-brand-slate mt-1">{t('filtersSubtitle')}</p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="w-10 h-10 rounded-xl hover:bg-primary-100 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-brand-graphite" />
              </button>
            </div>

            <div className="p-6 grid lg:grid-cols-2 gap-10">

              {/* Category chips */}
              <div>
                <h3 className="text-[13px] uppercase tracking-wide font-semibold text-brand-steel mb-4">
                  {t('categoriesHeading')}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCategoryChange('')}
                    className={`px-4 h-10 rounded-full text-[14px] font-medium transition-all ${
                      activeCategory === ''
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary hover:bg-primary-50'
                    }`}
                  >
                    {t('allProducts')}
                  </button>
                  {DB_CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => handleCategoryChange(cat.slug)}
                      className={`px-4 h-10 rounded-full text-[14px] font-medium transition-all ${
                        activeCategory === cat.slug
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary hover:bg-primary-50'
                      }`}
                    >
                      {tCategories(`${cat.slug}.full`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[13px] uppercase tracking-wide font-semibold text-brand-steel">
                    {t('priceRange')}
                  </h3>
                  <button
                    onClick={resetPriceDisplay}
                    className="text-[13px] font-medium text-brand-primary hover:text-brand-dark transition-colors"
                  >
                    {t('reset')}
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-7">
                  <div className="flex-1">
                    <p className="text-[12px] text-brand-steel mb-2">{t('minimum')}</p>
                    <div className="h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 flex items-center font-semibold text-brand-charcoal">
                      ₹{dispMin.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-brand-steel mb-2">{t('maximum')}</p>
                    <div className="h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 flex items-center font-semibold text-brand-charcoal">
                      {dispMax >= MAX_PRICE
                        ? `₹${(MAX_PRICE / 1000).toFixed(0)}k+`
                        : `₹${dispMax.toLocaleString('en-IN')}`}
                    </div>
                  </div>
                </div>

                <div className="relative h-8">
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-[5px] bg-primary-100 rounded-full" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[5px] bg-brand-primary rounded-full"
                    style={{
                      left:  `${(dispMin / MAX_PRICE) * 100}%`,
                      right: `${100 - (dispMax / MAX_PRICE) * 100}%`,
                    }}
                  />
                  <input
                    type="range" min={0} max={MAX_PRICE} step={100}
                    value={dispMin}
                    onChange={(e) => setDispMin(Math.min(Number(e.target.value), dispMax - 100))}
                    onMouseUp={applyPriceFilter}
                    onTouchEnd={applyPriceFilter}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-primary
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <input
                    type="range" min={0} max={MAX_PRICE} step={100}
                    value={dispMax}
                    onChange={(e) => setDispMax(Math.max(Number(e.target.value), dispMin + 100))}
                    onMouseUp={applyPriceFilter}
                    onTouchEnd={applyPriceFilter}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-primary
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>

                <div className="flex justify-between mt-3 text-[12px] text-brand-steel">
                  <span>₹0</span>
                  <span>₹{(MAX_PRICE / 1000).toFixed(0)}k+</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-100 bg-primary-50/40 flex items-center justify-between max-md:sticky max-md:bottom-0 max-md:bg-white max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
              <p className="text-[13px] text-brand-slate">
                {loading ? tc('loading') : t('productsFoundCount', { count: total })}
              </p>
              <button onClick={resetFilters} className="btn-primary h-10 px-5 text-[14px]">
                {t('resetFilters')}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="card border border-red-100 rounded-3xl py-16 text-center mb-8">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => fetchProducts(currentFilters())}
              className="btn-primary h-10 px-6 text-sm"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: isPhone ? 6 : PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Products grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}

        {/* Phones: endless scroll - this marker loads the next page as it nears view */}
        {isPhone && !loading && !error && loadedPage < totalPages && (
          <div ref={sentinelRef} className="py-6 flex items-center justify-center gap-2 text-sm text-brand-slate">
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />}
            {loadingMore ? t('loadingMore') : null}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="card border border-neutral-100 rounded-3xl py-20 text-center">
            <Package className="w-16 h-16 text-brand-steel opacity-30 mx-auto mb-5" />
            <h3 className="text-[22px] font-bold text-brand-charcoal mb-2">{t('noProductsFound')}</h3>
            <p className="text-[14px] text-brand-slate mb-6">{t('emptyStateSubtitle')}</p>
            <button onClick={resetFilters} className="btn-primary h-11 px-6 text-[14px]">
              {t('resetFilters')}
            </button>
          </div>
        )}

        {/* Pagination - larger screens only; phones scroll endlessly */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-10 max-md:hidden flex flex-col items-center gap-3">

            <div className="flex items-center justify-center w-full gap-2">

              {/* Previous */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={cn(
                  'flex items-center gap-1.5 h-10 px-2.5 sm:px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                  currentPage === 1
                    ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                    : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t('prev')}</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto hide-scrollbar min-w-0">
                {pages.map((p, idx) =>
                  p === '...' ? (
                    <span
                      key={`dots-${idx}`}
                      className="w-9 h-10 flex items-center justify-center text-brand-steel text-[14px] shrink-0"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p as number)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-[14px] font-medium transition-all shrink-0',
                        p === currentPage
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              {/* Next */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={cn(
                  'flex items-center gap-1.5 h-10 px-2.5 sm:px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                  currentPage === totalPages
                    ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                    : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                )}
              >
                <span className="hidden sm:inline">{t('next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Page info */}
            <p className="text-[13px] text-brand-steel">
              {t('pageOf', { current: currentPage, totalPages })}
              {total > 0 && ` · ${t('totalProductsSuffix', { count: total })}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const t = useTranslations('catalog');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-fog flex items-center justify-center gap-3 text-brand-slate">
          <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          {t('loadingCatalog')}
        </div>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
