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
  { value: 'recommended', label: 'Recommended' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'new_arrivals', label: 'New Arrivals' },
  { value: 'price_low_high', label: 'Price: Low to High' },
  { value: 'price_high_low', label: 'Price: High to Low' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'discount_high_low', label: 'Discount %: High to Low' },
];

const DISCOUNT_OPTIONS = [10, 20, 30, 50];
const RATING_OPTIONS = [3, 4];

export function ProductFilterBar({
  productCount = 0,
  categories = [
    { id: 'carpentry', name: 'Carpentry' },
    { id: 'plumbing', name: 'Plumbing' },
    { id: 'hardware', name: 'Hardware' },
    { id: 'electrical', name: 'Electrical' },
    { id: 'adhesives', name: 'Adhesives' },
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

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    price: true,
    category: true,
    brand: false,
    rating: false,
    discount: false,
  });

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterState>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onFilterChange?.(updatedFilters);
    },
    [filters, onFilterChange]
  );

  const handleSortChange = (sort: SortOption) => {
    handleFilterChange({ sort });
    setShowSortMenu(false);
  };

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    handleFilterChange({
      priceRange: {
        ...filters.priceRange,
        [type]: value,
      },
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    handleFilterChange({
      categories: filters.categories.includes(categoryId)
        ? filters.categories.filter(c => c !== categoryId)
        : [...filters.categories, categoryId],
    });
  };

  const handleBrandToggle = (brand: string) => {
    handleFilterChange({
      brands: filters.brands.includes(brand)
        ? filters.brands.filter(b => b !== brand)
        : [...filters.brands, brand],
    });
  };

  const handleRatingChange = (rating: number) => {
    handleFilterChange({
      minRating: filters.minRating === rating ? 0 : rating,
    });
  };

  const handleDiscountChange = (discount: number) => {
    handleFilterChange({
      minDiscount: filters.minDiscount === discount ? 0 : discount,
    });
  };

  const handleClearAllFilters = () => {
    const clearedFilters: FilterState = {
      sort: 'recommended',
      priceRange: { min: 0, max: 10000 },
      categories: [],
      brands: [],
      minRating: 0,
      minDiscount: 0,
      inStockOnly: false,
    };
    setFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
  };

  const toggleFilterExpanded = (filterName: string) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.minDiscount > 0) count++;
    if (filters.inStockOnly) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Top Bar: Sort + Filter Button + Product Count */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Sort Dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <span>Sort</span>
              {showSortMenu ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSortMenu && (
              <div className="absolute top-full mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      filters.sort === option.value
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Sort + Filter Button */}
          <div className="flex sm:hidden gap-2">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <span>Sort</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showSortMenu && (
              <div className="absolute top-full mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      filters.sort === option.value
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Product Count */}
          <div className="ml-auto hidden sm:block text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{productCount}</span> results
          </div>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFiltersCount > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Price Range Chip */}
              {(filters.priceRange.min > 0 || filters.priceRange.max < 10000) && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>
                    Price: ₹{filters.priceRange.min} - ₹{filters.priceRange.max}
                  </span>
                  <button
                    onClick={() =>
                      handleFilterChange({
                        priceRange: { min: 0, max: 10000 },
                      })
                    }
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Category Chips */}
              {filters.categories.map(categoryId => {
                const category = categories.find(c => c.id === categoryId);
                return (
                  <div
                    key={categoryId}
                    className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{category?.name}</span>
                    <button
                      onClick={() => handleCategoryToggle(categoryId)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Brand Chips */}
              {filters.brands.map(brand => (
                <div
                  key={brand}
                  className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  <span>{brand}</span>
                  <button
                    onClick={() => handleBrandToggle(brand)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Rating Chip */}
              {filters.minRating > 0 && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>{filters.minRating}★ & above</span>
                  <button
                    onClick={() => handleFilterChange({ minRating: 0 })}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Discount Chip */}
              {filters.minDiscount > 0 && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>{filters.minDiscount}%+ discount</span>
                  <button
                    onClick={() => handleFilterChange({ minDiscount: 0 })}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* In Stock Only Chip */}
              {filters.inStockOnly && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>In Stock Only</span>
                  <button
                    onClick={() =>
                      handleFilterChange({ inStockOnly: false })
                    }
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearAllFilters}
                  className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filter Sidebar */}
      <div className="hidden sm:block px-4 sm:px-6 lg:px-8 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            {/* Price Filter */}
            <div>
              <button
                onClick={() => toggleFilterExpanded('price')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-sm font-semibold text-gray-900">Price Range</h3>
                {expandedFilters.price ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedFilters.price && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={e =>
                        handlePriceChange('min', parseInt(e.target.value) || 0)
                      }
                      className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={e =>
                        handlePriceChange('max', parseInt(e.target.value) || 10000)
                      }
                      className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <button
                onClick={() => toggleFilterExpanded('category')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-sm font-semibold text-gray-900">Category</h3>
                {expandedFilters.category ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedFilters.category && (
                <div className="space-y-2">
                  {categories.map(category => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div>
              <button
                onClick={() => toggleFilterExpanded('brand')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-sm font-semibold text-gray-900">Brand</h3>
                {expandedFilters.brand ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedFilters.brand && (
                <div className="space-y-2">
                  {brands.map(brand => (
                    <label
                      key={brand}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.brands.includes(brand)}
                        onChange={() => handleBrandToggle(brand)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{brand}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Filter */}
            <div>
              <button
                onClick={() => toggleFilterExpanded('rating')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-sm font-semibold text-gray-900">Rating</h3>
                {expandedFilters.rating ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedFilters.rating && (
                <div className="space-y-2">
                  {RATING_OPTIONS.map(rating => (
                    <label
                      key={rating}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.minRating === rating}
                        onChange={() => handleRatingChange(rating)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                        <span className="text-sm text-gray-700">
                          {rating}★ & above
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Filter */}
            <div>
              <button
                onClick={() => toggleFilterExpanded('discount')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="text-sm font-semibold text-gray-900">Discount</h3>
                {expandedFilters.discount ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedFilters.discount && (
                <div className="space-y-2">
                  {DISCOUNT_OPTIONS.map(discount => (
                    <label
                      key={discount}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.minDiscount === discount}
                        onChange={() => handleDiscountChange(discount)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {discount}%+
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* In Stock Only */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.inStockOnly}
                    onChange={e =>
                      handleFilterChange({ inStockOnly: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-30 sm:hidden"
            onClick={() => setShowMobileFilters(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xs bg-white shadow-lg overflow-y-auto sm:hidden">
            <div className="sticky top-0 flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Price Range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Price Range
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={e =>
                      handlePriceChange('min', parseInt(e.target.value) || 0)
                    }
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={e =>
                      handlePriceChange('max', parseInt(e.target.value) || 10000)
                    }
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Category
                </h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Brand
                </h3>
                <div className="space-y-2">
                  {brands.map(brand => (
                    <label
                      key={brand}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.brands.includes(brand)}
                        onChange={() => handleBrandToggle(brand)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Rating
                </h3>
                <div className="space-y-2">
                  {RATING_OPTIONS.map(rating => (
                    <label
                      key={rating}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.minRating === rating}
                        onChange={() => handleRatingChange(rating)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                        <span className="text-sm text-gray-700">
                          {rating}★ & above
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Discount
                </h3>
                <div className="space-y-2">
                  {DISCOUNT_OPTIONS.map(discount => (
                    <label
                      key={discount}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.minDiscount === discount}
                        onChange={() => handleDiscountChange(discount)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {discount}%+
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* In Stock Only */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.inStockOnly}
                    onChange={e =>
                      handleFilterChange({ inStockOnly: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>

              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    handleClearAllFilters();
                    setShowMobileFilters(false);
                  }}
                  className="w-full mt-6 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              )}

              {/* Apply Button */}
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
