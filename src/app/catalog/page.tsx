'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types';
import {
  Package, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── DB category definitions ────────────────────────────────────────────────────

// One entry per category table — no sub-categories.
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

function SkeletonCard() {
  return (
    <div className="product-card h-[340px] flex flex-col overflow-hidden animate-pulse">
      <div className="h-40 bg-neutral-200 flex-shrink-0" />
      <div className="p-4 flex flex-col gap-2 flex-grow">
        <div className="h-3 w-16 bg-neutral-200 rounded" />
        <div className="h-4 w-3/4 bg-neutral-200 rounded" />
        <div className="h-3 w-full bg-neutral-100 rounded" />
        <div className="h-3 w-2/3 bg-neutral-100 rounded" />
        <div className="mt-auto h-5 w-1/3 bg-neutral-200 rounded" />
        <div className="h-9 bg-neutral-200 rounded-xl" />
      </div>
    </div>
  );
}

// ── Main catalog content ──────────────────────────────────────────────────────

function CatalogPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Read initial state from URL ───────────────────────────────────────────
  const initialCategory = searchParams.get('category')  || '';
  const initialQuery    = searchParams.get('q')          || '';
  const initialPage     = Math.max(1, parseInt(searchParams.get('page')      || '1',              10));
  const initialMinPrice = Math.max(0, parseInt(searchParams.get('min_price') || '0',              10));
  const initialMaxPrice = Math.min(MAX_PRICE, parseInt(searchParams.get('max_price') || String(MAX_PRICE), 10));

  // ── State ────────────────────────────────────────────────────────────────
  const [products,      setProducts]      = useState<Product[]>([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery,    setSearchQuery]    = useState(initialQuery);
  const [showFilters,    setShowFilters]    = useState(false);
  const [currentPage,    setCurrentPage]    = useState(initialPage);

  // Price display state (updates on every slider drag) vs active filter state
  // (updates on mouseup — triggers API refetch)
  const [dispMin,   setDispMin]   = useState(initialMinPrice);
  const [dispMax,   setDispMax]   = useState(initialMaxPrice);
  const [activeMin, setActiveMin] = useState(initialMinPrice);
  const [activeMax, setActiveMax] = useState(initialMaxPrice);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch from API ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (
    cat: string, q: string, page: number, minP: number, maxP: number,
  ) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (cat)              params.set('category',  cat);
      if (q)                params.set('q',         q);
      if (minP > 0)         params.set('min_price', String(minP));
      if (maxP < MAX_PRICE) params.set('max_price', String(maxP));

      const res  = await fetch(`/api/products?${params}`, { signal: ctrl.signal });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Unknown error');

      setProducts(json.data.products as Product[]);
      setTotal(json.data.total);
      setTotalPages(Math.max(1, Math.ceil(json.data.total / PAGE_SIZE)));
      setLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('Failed to load products. Please try again.');
      setLoading(false);
    }
  }, []);

  // Refetch whenever filter state changes
  useEffect(() => {
    fetchProducts(activeCategory, searchQuery, currentPage, activeMin, activeMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery, currentPage, activeMin, activeMax]);

  // Sync URL → state on browser back/forward
  useEffect(() => {
    const q    = searchParams.get('q')          || '';
    const cat  = searchParams.get('category')   || '';
    const page = Math.max(1, parseInt(searchParams.get('page')      || '1',              10));
    const minP = Math.max(0, parseInt(searchParams.get('min_price') || '0',              10));
    const maxP = Math.min(MAX_PRICE, parseInt(searchParams.get('max_price') || String(MAX_PRICE), 10));
    setSearchQuery(q);
    setActiveCategory(cat);
    setCurrentPage(page);
    setActiveMin(minP); setDispMin(minP);
    setActiveMax(maxP); setDispMax(maxP);
  }, [searchParams]);

  // ── URL builder ───────────────────────────────────────────────────────────
  const buildUrl = (cat: string, q: string, page: number, minP: number, maxP: number) => {
    const p = new URLSearchParams();
    if (cat)              p.set('category',  cat);
    if (q)                p.set('q',         q);
    if (page > 1)         p.set('page',      String(page));
    if (minP > 0)         p.set('min_price', String(minP));
    if (maxP < MAX_PRICE) p.set('max_price', String(maxP));
    const qs = p.toString();
    // Cast needed: typedRoutes strict check doesn't cover dynamic catalog URLs
    return `/catalog${qs ? '?' + qs : ''}` as any;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setActiveCategory('');
    setCurrentPage(1);
    router.replace(buildUrl('', q, 1, activeMin, activeMax), { scroll: false });
  };

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    setSearchQuery('');
    setCurrentPage(1);
    router.replace(buildUrl(slug, '', 1, activeMin, activeMax), { scroll: false });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.replace(buildUrl(activeCategory, searchQuery, page, activeMin, activeMax), { scroll: false });
  };

  // Called on slider mouseup/touchend — commits display state to active filter
  const applyPriceFilter = () => {
    setActiveMin(dispMin);
    setActiveMax(dispMax);
    setCurrentPage(1);
    router.replace(buildUrl(activeCategory, searchQuery, 1, dispMin, dispMax), { scroll: false });
  };

  const resetPriceDisplay = () => {
    setDispMin(0);
    setDispMax(MAX_PRICE);
  };

  const resetFilters = () => {
    setActiveCategory('');
    setSearchQuery('');
    setCurrentPage(1);
    setDispMin(0);   setDispMax(MAX_PRICE);
    setActiveMin(0); setActiveMax(MAX_PRICE);
    router.replace('/catalog', { scroll: false });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const pages            = paginationRange(currentPage, totalPages);
  const activeCategoryName = DB_CATEGORIES.find((c) => c.slug === activeCategory)?.name ?? null;
  const isPriceFiltered  = activeMin > 0 || activeMax < MAX_PRICE;
  const rangeStart       = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd         = Math.min(currentPage * PAGE_SIZE, total);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-fog">

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            {loading ? (
              <p className="text-[15px] text-brand-slate">Loading products…</p>
            ) : error ? (
              <p className="text-[15px] text-red-600">{error}</p>
            ) : searchQuery ? (
              <p className="text-[15px] text-brand-slate">
                <span className="font-semibold text-brand-charcoal">{total}</span>{' '}
                results for{' '}
                <span className="font-semibold text-brand-primary">&quot;{searchQuery}&quot;</span>
              </p>
            ) : activeCategoryName ? (
              <p className="text-[15px] text-brand-slate">
                {total > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-brand-charcoal">{rangeStart}–{rangeEnd}</span>
                    {' '}of{' '}
                    <span className="font-semibold text-brand-charcoal">{total}</span>
                    {' '}products in{' '}
                    <span className="font-semibold text-brand-primary">{activeCategoryName}</span>
                  </>
                ) : (
                  <>No products in <span className="font-semibold text-brand-primary">{activeCategoryName}</span></>
                )}
              </p>
            ) : (
              <p className="text-[15px] text-brand-slate">
                {total > 0 ? (
                  <>
                    <span className="font-semibold text-brand-charcoal">{total}</span>{' '}products available
                  </>
                ) : (
                  <>No products found</>
                )}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 px-5 bg-white border border-neutral-200 rounded-xl text-[14px] font-medium text-brand-charcoal hover:border-brand-primary hover:bg-primary-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
            Filters
            {isPriceFiltered && (
              <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0" />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-10 bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm">

            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
              <div>
                <h2 className="text-[18px] font-bold text-brand-charcoal">Filters</h2>
                <p className="text-[13px] text-brand-slate mt-1">Refine products instantly</p>
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
                  Categories
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
                    All Products
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
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[13px] uppercase tracking-wide font-semibold text-brand-steel">
                    Price Range
                  </h3>
                  <button
                    onClick={resetPriceDisplay}
                    className="text-[13px] font-medium text-brand-primary hover:text-brand-dark transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-7">
                  <div className="flex-1">
                    <p className="text-[12px] text-brand-steel mb-2">Minimum</p>
                    <div className="h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 flex items-center font-semibold text-brand-charcoal">
                      ₹{dispMin.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-brand-steel mb-2">Maximum</p>
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

            <div className="px-6 py-4 border-t border-neutral-100 bg-primary-50/40 flex items-center justify-between">
              <p className="text-[13px] text-brand-slate">
                {loading ? 'Loading…' : `${total} products found`}
              </p>
              <button onClick={resetFilters} className="btn-primary h-10 px-5 text-[14px]">
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="card border border-red-100 rounded-3xl py-16 text-center mb-8">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => fetchProducts(activeCategory, searchQuery, currentPage, activeMin, activeMax)}
              className="btn-primary h-10 px-6 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Products grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="card border border-neutral-100 rounded-3xl py-20 text-center">
            <Package className="w-16 h-16 text-brand-steel opacity-30 mx-auto mb-5" />
            <h3 className="text-[22px] font-bold text-brand-charcoal mb-2">No products found</h3>
            <p className="text-[14px] text-brand-slate mb-6">Try adjusting your filters or search query</p>
            <button onClick={resetFilters} className="btn-primary h-11 px-6 text-[14px]">
              Reset Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-10 flex flex-col items-center gap-3">

            <div className="flex items-center justify-between w-full gap-2">

              {/* Previous */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={cn(
                  'flex items-center gap-1.5 h-10 px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                  currentPage === 1
                    ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                    : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {pages.map((p, idx) =>
                  p === '...' ? (
                    <span
                      key={`dots-${idx}`}
                      className="w-9 h-10 flex items-center justify-center text-brand-steel text-[14px]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p as number)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-[14px] font-medium transition-all',
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
                  'flex items-center gap-1.5 h-10 px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                  currentPage === totalPages
                    ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                    : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Page info */}
            <p className="text-[13px] text-brand-steel">
              Page {currentPage} of {totalPages}
              {total > 0 && ` · ${total} product${total !== 1 ? 's' : ''} total`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-fog flex items-center justify-center gap-3 text-brand-slate">
          <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          Loading catalog…
        </div>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
