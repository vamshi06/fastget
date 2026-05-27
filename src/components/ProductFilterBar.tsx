'use client';

import { useState, useCallback } from 'react';
import {
  X,
  ChevronDown,
  Filter,
  ChevronUp,
  Star,
} from 'lucide-react';

// Types
export type SortOption =
  | 'recommended'
  | 'best_selling'
  | 'new_arrivals'
  | 'price_low_high'
  | 'price_high_low'
  | 'highest_rated'
  | 'discount_high_low';

export interface FilterState {
  sort: SortOption;
  priceRange: {
    min: number;
    max: number;
  };
  categories: string[];
  brands: string[];
  minRating: number;
  minDiscount: number;
  inStockOnly: boolean;
}

export interface ProductFilterBarProps {
  productCount?: number;
  categories?: Array<{ id: string; name: string }>;
  brands?: string[];
  onFilterChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'recommended',    label: 'Recommended' },
  { value: 'best_selling',   label: 'Best Selling' },
  { value: 'new_arrivals',   label: 'New Arrivals' },
  { value: 'price_low_high', label: 'Price: Low to High' },
  { value: 'price_high_low', label: 'Price: High to Low' },
  { value: 'highest_rated',  label: 'Highest Rated' },
  { value: 'discount_high_low', label: 'Discount %: High to Low' },
];

const DISCOUNT_OPTIONS = [10, 20, 30, 50];
const RATING_OPTIONS = [3, 4];

export function ProductFilterBar({
  productCount = 0,
  categories = [
    { id: 'carpentry',  name: 'Carpentry' },
    { id: 'plumbing',   name: 'Plumbing' },
    { id: 'hardware',   name: 'Hardware' },
    { id: 'electrical', name: 'Electrical' },
    { id: 'adhesives',  name: 'Adhesives' },
  ],
  brands = ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
  onFilterChange,
  initialFilters = {},
}: ProductFilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    sort: 'recommended',
    priceRange: { min: 0, max: 10000 },
    categories: [],
    brands: [],
    minRating: 0,
    minDiscount: 0,
    inStockOnly: false,
    ...initialFilters,
  });

  const [showSortMenu,      setShowSortMenu]      = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedFilters,   setExpandedFilters]   = useState<Record<string, boolean>>({
    price: true, category: true, brand: false, rating: false, discount: false,
  });

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterState>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onFilterChange?.(updatedFilters);
    },
    [filters, onFilterChange],
  );

  const handleSortChange      = (sort: SortOption) => { handleFilterChange({ sort }); setShowSortMenu(false); };
  const handlePriceChange     = (type: 'min' | 'max', value: number) => handleFilterChange({ priceRange: { ...filters.priceRange, [type]: value } });
  const handleCategoryToggle  = (id: string) => handleFilterChange({ categories: filters.categories.includes(id) ? filters.categories.filter(c => c !== id) : [...filters.categories, id] });
  const handleBrandToggle     = (b: string)  => handleFilterChange({ brands: filters.brands.includes(b) ? filters.brands.filter(x => x !== b) : [...filters.brands, b] });
  const handleRatingChange    = (r: number)  => handleFilterChange({ minRating: filters.minRating === r ? 0 : r });
  const handleDiscountChange  = (d: number)  => handleFilterChange({ minDiscount: filters.minDiscount === d ? 0 : d });

  const handleClearAllFilters = () => {
    const cleared: FilterState = { sort: 'recommended', priceRange: { min: 0, max: 10000 }, categories: [], brands: [], minRating: 0, minDiscount: 0, inStockOnly: false };
    setFilters(cleared);
    onFilterChange?.(cleared);
  };

  const toggleFilterExpanded = (name: string) =>
    setExpandedFilters(prev => ({ ...prev, [name]: !prev[name] }));

  const getActiveFiltersCount = () => {
    let n = 0;
    if (filters.categories.length > 0) n++;
    if (filters.brands.length > 0) n++;
    if (filters.minRating > 0) n++;
    if (filters.minDiscount > 0) n++;
    if (filters.inStockOnly) n++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) n++;
    return n;
  };

  const activeFiltersCount = getActiveFiltersCount();

  /* shared checkbox classes */
  const checkboxCls = 'w-4 h-4 rounded border-neutral-300 cursor-pointer accent-brand-primary';
  const filterInputCls = 'w-1/2 px-2 py-1 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-brand-charcoal';
  const activeChipCls = 'flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm';

  return (
    <div className="bg-white border-b border-neutral-200">
      {/* ── Top Bar ── */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Sort — desktop */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-brand-graphite"
            >
              <span>Sort</span>
              {showSortMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSortMenu && (
              <div className="absolute top-full mt-2 w-52 bg-white border border-neutral-200 rounded-2xl shadow-card-hover z-20 overflow-hidden">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortChange(opt.value)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-neutral-100 last:border-b-0 ${
                      filters.sort === opt.value
                        ? 'bg-primary-50 text-brand-primary font-semibold'
                        : 'text-brand-graphite hover:bg-neutral-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort + Filter — mobile */}
          <div className="flex sm:hidden gap-2">
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-brand-graphite"
              >
                <span>Sort</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showSortMenu && (
                <div className="absolute top-full mt-2 w-44 bg-white border border-neutral-200 rounded-2xl shadow-card-hover z-20 overflow-hidden">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSortChange(opt.value)}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors border-b border-neutral-100 last:border-b-0 ${
                        filters.sort === opt.value
                          ? 'bg-primary-50 text-brand-primary font-semibold'
                          : 'text-brand-graphite hover:bg-neutral-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium text-brand-graphite"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-brand-primary rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Product count */}
          <div className="ml-auto hidden sm:block text-sm text-brand-slate">
            Showing <span className="font-semibold text-brand-charcoal">{productCount}</span> results
          </div>
        </div>
      </div>

      {/* ── Active Filter Chips ── */}
      {activeFiltersCount > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 items-center">
              {(filters.priceRange.min > 0 || filters.priceRange.max < 10000) && (
                <div className={activeChipCls}>
                  <span>Price: ₹{filters.priceRange.min}–₹{filters.priceRange.max}</span>
                  <button onClick={() => handleFilterChange({ priceRange: { min: 0, max: 10000 } })} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              )}
              {filters.categories.map(id => (
                <div key={id} className={activeChipCls}>
                  <span>{categories.find(c => c.id === id)?.name}</span>
                  <button onClick={() => handleCategoryToggle(id)} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {filters.brands.map(b => (
                <div key={b} className={activeChipCls}>
                  <span>{b}</span>
                  <button onClick={() => handleBrandToggle(b)} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {filters.minRating > 0 && (
                <div className={activeChipCls}>
                  <span>{filters.minRating}★ & above</span>
                  <button onClick={() => handleFilterChange({ minRating: 0 })} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              )}
              {filters.minDiscount > 0 && (
                <div className={activeChipCls}>
                  <span>{filters.minDiscount}%+ discount</span>
                  <button onClick={() => handleFilterChange({ minDiscount: 0 })} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              )}
              {filters.inStockOnly && (
                <div className={activeChipCls}>
                  <span>In Stock Only</span>
                  <button onClick={() => handleFilterChange({ inStockOnly: false })} className="hover:text-primary-900"><X className="w-3 h-3" /></button>
                </div>
              )}
              <button onClick={handleClearAllFilters} className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium underline">
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Filter Row ── */}
      <div className="hidden sm:block px-4 sm:px-6 lg:px-8 py-6 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">

            {/* Price */}
            <div>
              <button onClick={() => toggleFilterExpanded('price')} className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Price Range</h3>
                {expandedFilters.price ? <ChevronUp className="w-4 h-4 text-brand-slate" /> : <ChevronDown className="w-4 h-4 text-brand-slate" />}
              </button>
              {expandedFilters.price && (
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={filters.priceRange.min} onChange={e => handlePriceChange('min', parseInt(e.target.value) || 0)} className={filterInputCls} />
                  <input type="number" placeholder="Max" value={filters.priceRange.max} onChange={e => handlePriceChange('max', parseInt(e.target.value) || 10000)} className={filterInputCls} />
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <button onClick={() => toggleFilterExpanded('category')} className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Category</h3>
                {expandedFilters.category ? <ChevronUp className="w-4 h-4 text-brand-slate" /> : <ChevronDown className="w-4 h-4 text-brand-slate" />}
              </button>
              {expandedFilters.category && (
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.categories.includes(cat.id)} onChange={() => handleCategoryToggle(cat.id)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Brand */}
            <div>
              <button onClick={() => toggleFilterExpanded('brand')} className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Brand</h3>
                {expandedFilters.brand ? <ChevronUp className="w-4 h-4 text-brand-slate" /> : <ChevronDown className="w-4 h-4 text-brand-slate" />}
              </button>
              {expandedFilters.brand && (
                <div className="space-y-2">
                  {brands.map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.brands.includes(b)} onChange={() => handleBrandToggle(b)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{b}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rating */}
            <div>
              <button onClick={() => toggleFilterExpanded('rating')} className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Rating</h3>
                {expandedFilters.rating ? <ChevronUp className="w-4 h-4 text-brand-slate" /> : <ChevronDown className="w-4 h-4 text-brand-slate" />}
              </button>
              {expandedFilters.rating && (
                <div className="space-y-2">
                  {RATING_OPTIONS.map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.minRating === r} onChange={() => handleRatingChange(r)} className={checkboxCls} />
                      <div className="flex items-center gap-1">
                        {[...Array(r)].map((_, i) => <Star key={i} className="w-3 h-3 fill-brand-primary text-brand-primary" />)}
                        <span className="text-sm text-brand-graphite">{r}★ & above</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Discount */}
            <div>
              <button onClick={() => toggleFilterExpanded('discount')} className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-semibold text-brand-charcoal">Discount</h3>
                {expandedFilters.discount ? <ChevronUp className="w-4 h-4 text-brand-slate" /> : <ChevronDown className="w-4 h-4 text-brand-slate" />}
              </button>
              {expandedFilters.discount && (
                <div className="space-y-2">
                  {DISCOUNT_OPTIONS.map(d => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.minDiscount === d} onChange={() => handleDiscountChange(d)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{d}%+</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.inStockOnly} onChange={e => handleFilterChange({ inStockOnly: e.target.checked })} className={checkboxCls} />
                  <span className="text-sm text-brand-graphite">In Stock Only</span>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      {showMobileFilters && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 sm:hidden" onClick={() => setShowMobileFilters(false)} />
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xs bg-white shadow-lg overflow-y-auto sm:hidden">
            <div className="sticky top-0 flex items-center justify-between px-4 py-4 border-b border-neutral-100 bg-white">
              <h2 className="text-lg font-semibold text-brand-charcoal">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-brand-slate" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Price */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Price Range</h3>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={filters.priceRange.min} onChange={e => handlePriceChange('min', parseInt(e.target.value) || 0)} className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-brand-charcoal" />
                  <input type="number" placeholder="Max" value={filters.priceRange.max} onChange={e => handlePriceChange('max', parseInt(e.target.value) || 10000)} className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-brand-charcoal" />
                </div>
              </div>

              {/* Category */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Category</h3>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.categories.includes(cat.id)} onChange={() => handleCategoryToggle(cat.id)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Brand</h3>
                <div className="space-y-2">
                  {brands.map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.brands.includes(b)} onChange={() => handleBrandToggle(b)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Rating</h3>
                <div className="space-y-2">
                  {RATING_OPTIONS.map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.minRating === r} onChange={() => handleRatingChange(r)} className={checkboxCls} />
                      <div className="flex items-center gap-1">
                        {[...Array(r)].map((_, i) => <Star key={i} className="w-3 h-3 fill-brand-primary text-brand-primary" />)}
                        <span className="text-sm text-brand-graphite">{r}★ & above</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div>
                <h3 className="text-sm font-semibold text-brand-charcoal mb-3">Discount</h3>
                <div className="space-y-2">
                  {DISCOUNT_OPTIONS.map(d => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filters.minDiscount === d} onChange={() => handleDiscountChange(d)} className={checkboxCls} />
                      <span className="text-sm text-brand-graphite">{d}%+</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <div className="pt-4 border-t border-neutral-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.inStockOnly} onChange={e => handleFilterChange({ inStockOnly: e.target.checked })} className={checkboxCls} />
                  <span className="text-sm text-brand-graphite">In Stock Only</span>
                </label>
              </div>

              {activeFiltersCount > 0 && (
                <button onClick={() => { handleClearAllFilters(); setShowMobileFilters(false); }} className="w-full mt-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors">
                  Clear All Filters
                </button>
              )}

              <button onClick={() => setShowMobileFilters(false)} className="btn-primary w-full mt-2">
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
