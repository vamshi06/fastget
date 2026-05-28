'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { Product } from '@/types';
import { Package, SlidersHorizontal, ChevronDown, X, Loader2 } from 'lucide-react';

// ── DB category definitions ────────────────────────────────────────────────────

// One entry per category table — no sub-categories.
const DB_CATEGORIES = [
  { slug: 'tools-machines',    name: 'Tools & Machines'   },
  { slug: 'carpentry',         name: 'Carpentry'          },
  { slug: 'paints',            name: 'Paints & Polish'    },
  { slug: 'plumbing',          name: 'Plumbing'           },
  { slug: 'civil-materials',   name: 'Civil Materials'    },
  { slug: 'electrical',        name: 'Electrical'         },
  { slug: 'flooring-ceilings', name: 'Flooring & Ceilings' },
  { slug: 'glass-aluminium',   name: 'Glass & Aluminium'  },
] as const;

// Skeleton card for loading state
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

const PAGE_SIZE = 24;

function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery    = searchParams.get('q')        || '';
  const initialCategory = searchParams.get('category') || '';

  // ── State ────────────────────────────────────────────────────────────────
  const [allProducts,    setAllProducts]    = useState<Product[]>([]);
  const [dbTotal,        setDbTotal]        = useState<number | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery,    setSearchQuery]    = useState(initialQuery);
  const [showFilters,    setShowFilters]    = useState(false);
  const [priceRange,     setPriceRange]     = useState({ min: 0, max: 999999 });
  const [priceInit,      setPriceInit]      = useState(false);
  const [page,           setPage]           = useState(1);

  // Keep a ref for abort control
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch products from API ───────────────────────────────────────────────
  const fetchProducts = useCallback(async (cat: string, q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setPage(1);

    try {
      const params = new URLSearchParams({ limit: '500' });
      if (cat)  params.set('category', cat);
      if (q)    params.set('q', q);

      const res  = await fetch(`/api/products?${params}`, { signal: ctrl.signal });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Unknown error');

      const products: Product[] = json.data.products;
      setAllProducts(products);
      if (json.data.total !== undefined) setDbTotal(json.data.total);

      if (!priceInit && products.length > 0) {
        const prices = products.map((p) => p.price);
        setPriceRange({ min: Math.min(...prices), max: Math.max(...prices) });
        setPriceInit(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [priceInit]);

  // Fetch on mount and when URL params change
  useEffect(() => {
    fetchProducts(activeCategory, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery]);

  // Sync URL → state when user navigates back/forward
  useEffect(() => {
    const q   = searchParams.get('q')        || '';
    const cat = searchParams.get('category') || '';
    setSearchQuery(q);
    setActiveCategory(cat);
  }, [searchParams]);

  // ── Derived price bounds (across ALL loaded products) ────────────────────
  const { absoluteMin, absoluteMax } = useMemo(() => {
    if (allProducts.length === 0) return { absoluteMin: 0, absoluteMax: 999999 };
    const prices = allProducts.map((p) => p.price);
    return { absoluteMin: Math.min(...prices), absoluteMax: Math.max(...prices) };
  }, [allProducts]);

  // ── Client-side price filter ─────────────────────────────────────────────
  const filteredProducts = useMemo(
    () => allProducts.filter((p) => p.price >= priceRange.min && p.price <= priceRange.max),
    [allProducts, priceRange],
  );

  // ── Pagination slice ─────────────────────────────────────────────────────
  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, page * PAGE_SIZE),
    [filteredProducts, page],
  );
  const hasMore = displayedProducts.length < filteredProducts.length;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setActiveCategory('');
    router.replace(`/catalog?q=${encodeURIComponent(q)}`, { scroll: false });
  };

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    setSearchQuery('');
    if (slug) {
      router.replace(`/catalog?category=${slug}`, { scroll: false });
    } else {
      router.replace('/catalog', { scroll: false });
    }
  };

  const handleMinChange = (v: number) =>
    setPriceRange((prev) => ({ ...prev, min: Math.min(v, prev.max - 1) }));
  const handleMaxChange = (v: number) =>
    setPriceRange((prev) => ({ ...prev, max: Math.max(v, prev.min + 1) }));

  const resetFilters = () => {
    setActiveCategory('');
    setSearchQuery('');
    setPriceRange({ min: absoluteMin, max: absoluteMax });
    router.replace('/catalog', { scroll: false });
  };

  const activeCategoryName =
    DB_CATEGORIES.find((c) => c.slug === activeCategory)?.name ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-fog">

      {/* Header */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-3xl">
            <h1 className="text-[36px] leading-tight font-black tracking-[-0.03em] text-brand-charcoal mb-3">
              Product Catalog
            </h1>
            <p className="text-[15px] text-brand-slate mb-7 leading-relaxed">
              Browse construction materials with fast delivery and live inventory.
            </p>
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search products, brands..."
              initialValue={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Main */}
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
                <span className="font-semibold text-brand-charcoal">{filteredProducts.length}</span>{' '}
                results for{' '}
                <span className="font-semibold text-brand-primary">&quot;{searchQuery}&quot;</span>
              </p>
            ) : activeCategoryName ? (
              <p className="text-[15px] text-brand-slate">
                Showing{' '}
                <span className="font-semibold text-brand-charcoal">{filteredProducts.length}</span>{' '}
                products in{' '}
                <span className="font-semibold text-brand-primary">{activeCategoryName}</span>
              </p>
            ) : (
              <p className="text-[15px] text-brand-slate">
                <span className="font-semibold text-brand-charcoal">{filteredProducts.length}</span>{' '}
                products available
                {dbTotal !== null && dbTotal !== filteredProducts.length && (
                  <span className="text-brand-steel text-[13px] ml-1">
                    ({dbTotal} in catalogue)
                  </span>
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
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
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

              {/* Categories */}
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

              {/* Price Range */}
              {absoluteMax > absoluteMin && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[13px] uppercase tracking-wide font-semibold text-brand-steel">
                      Price Range
                    </h3>
                    <button
                      onClick={() => setPriceRange({ min: absoluteMin, max: absoluteMax })}
                      className="text-[13px] font-medium text-brand-primary hover:text-brand-dark transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-7">
                    <div className="flex-1">
                      <p className="text-[12px] text-brand-steel mb-2">Minimum</p>
                      <div className="h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 flex items-center font-semibold text-brand-charcoal">
                        ₹{priceRange.min}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] text-brand-steel mb-2">Maximum</p>
                      <div className="h-11 rounded-xl border border-primary-200 bg-primary-50 px-4 flex items-center font-semibold text-brand-charcoal">
                        ₹{priceRange.max}
                      </div>
                    </div>
                  </div>

                  <div className="relative h-8">
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-[5px] bg-primary-100 rounded-full" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-[5px] bg-brand-primary rounded-full"
                      style={{
                        left: `${((priceRange.min - absoluteMin) / (absoluteMax - absoluteMin)) * 100}%`,
                        right: `${100 - ((priceRange.max - absoluteMin) / (absoluteMax - absoluteMin)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={absoluteMin} max={absoluteMax} value={priceRange.min}
                      onChange={(e) => handleMinChange(Number(e.target.value))}
                      className="absolute w-full appearance-none bg-transparent pointer-events-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-primary
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <input
                      type="range"
                      min={absoluteMin} max={absoluteMax} value={priceRange.max}
                      onChange={(e) => handleMaxChange(Number(e.target.value))}
                      className="absolute w-full appearance-none bg-transparent pointer-events-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-primary
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>

                  <div className="flex justify-between mt-3 text-[12px] text-brand-steel">
                    <span>₹{absoluteMin}</span>
                    <span>₹{absoluteMax}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-neutral-100 bg-primary-50/40 flex items-center justify-between">
              <p className="text-[13px] text-brand-slate">
                {filteredProducts.length} products found
              </p>
              <button onClick={resetFilters} className="btn-primary h-10 px-5 text-[14px]">
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card border border-red-100 rounded-3xl py-16 text-center mb-8">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => fetchProducts(activeCategory, searchQuery)}
              className="btn-primary h-10 px-6 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && displayedProducts.length > 0 && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary h-11 px-8 text-[14px]"
                >
                  Load more ({filteredProducts.length - displayedProducts.length} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && displayedProducts.length === 0 && (
          <div className="card border border-neutral-100 rounded-3xl py-20 text-center">
            <Package className="w-16 h-16 text-brand-steel opacity-30 mx-auto mb-5" />
            <h3 className="text-[22px] font-bold text-brand-charcoal mb-2">No products found</h3>
            <p className="text-[14px] text-brand-slate mb-6">Try adjusting your filters or search query</p>
            <button onClick={resetFilters} className="btn-primary h-11 px-6 text-[14px]">
              Reset Filters
            </button>
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
