'use client';

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
} from 'react';

import { useSearchParams } from 'next/navigation';

import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';

import {
  products,
  categories,
  searchProducts,
  getProductsByCategory,
} from '@/data/products';

import {
  Product,
  CategoryId,
} from '@/types';

import {
  Package,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';

function CatalogPageContent() {
  const searchParams = useSearchParams();

  const initialQuery =
    searchParams.get('q') || '';

  const initialCategory =
    searchParams.get('category') || '';

  // Dynamic product pricing
  const prices = products.map(
    (p) => p.price
  );

  const absoluteMinPrice =
    Math.min(...prices);

  const absoluteMaxPrice =
    Math.max(...prices);

  const [displayedProducts, setDisplayedProducts] =
    useState<Product[]>(products);

  const [activeCategory, setActiveCategory] =
    useState<CategoryId | ''>(
      initialCategory as CategoryId | ''
    );

  const [searchQuery, setSearchQuery] =
    useState(initialQuery);

  // Shopify-style filter dropdown
  const [showFilters, setShowFilters] =
    useState(false);

  // Dynamic price range
  const [priceRange, setPriceRange] =
    useState({
      min: absoluteMinPrice,
      max: absoluteMaxPrice,
    });

  // Base products
  const baseProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchProducts(searchQuery);
    }

    if (activeCategory) {
      return getProductsByCategory(
        activeCategory
      );
    }

    return products;
  }, [searchQuery, activeCategory]);

  // Filtering
  useEffect(() => {
    const filtered = baseProducts.filter(
      (p) =>
        p.price >= priceRange.min &&
        p.price <= priceRange.max
    );

    setDisplayedProducts(filtered);
  }, [baseProducts, priceRange]);

  // URL params
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      setActiveCategory('');
    }

    if (initialCategory) {
      setActiveCategory(
        initialCategory as CategoryId
      );

      setSearchQuery('');
    }
  }, [initialQuery, initialCategory]);

  const handleSearch = (
    query: string
  ) => {
    setSearchQuery(query);
    setActiveCategory('');
  };

  const handleCategoryChange = (
    categoryId: CategoryId | ''
  ) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
  };

  // Prevent overlap
  const handleMinChange = (
    value: number
  ) => {
    setPriceRange((prev) => ({
      ...prev,
      min: Math.min(
        value,
        prev.max - 1
      ),
    }));
  };

  const handleMaxChange = (
    value: number
  ) => {
    setPriceRange((prev) => ({
      ...prev,
      max: Math.max(
        value,
        prev.min + 1
      ),
    }));
  };

  const resetFilters = () => {
    setActiveCategory('');

    setPriceRange({
      min: absoluteMinPrice,
      max: absoluteMaxPrice,
    });
  };

  const activeCategoryName =
    activeCategory
      ? categories.find(
          (c) =>
            c.id === activeCategory
        )?.name
      : null;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">

      {/* Header */}
      <div className="bg-white border-b border-blue-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="max-w-3xl">

            <h1 className="text-[36px] leading-tight font-bold tracking-[-0.03em] text-gray-900 mb-3">
              Product Catalog
            </h1>

            <p className="text-[15px] text-gray-600 mb-7 leading-relaxed">
              Browse urgent construction materials
              with fast delivery and live inventory.
            </p>

            <SearchBar
              onSearch={handleSearch}
              placeholder="Search products..."
            />
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">

          {/* Results */}
          <div>

            {searchQuery ? (
              <p className="text-[15px] text-gray-600">
                <span className="font-semibold text-gray-900">
                  {
                    displayedProducts.length
                  }
                </span>{' '}
                results for{' '}
                <span className="font-medium text-blue-700">
                  &quot;{searchQuery}&quot;
                </span>
              </p>
            ) : activeCategoryName ? (
              <p className="text-[15px] text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {
                    displayedProducts.length
                  }
                </span>{' '}
                products in{' '}
                <span className="font-medium text-blue-700">
                  {
                    activeCategoryName
                  }
                </span>
              </p>
            ) : (
              <p className="text-[15px] text-gray-600">
                <span className="font-semibold text-gray-900">
                  {
                    displayedProducts.length
                  }
                </span>{' '}
                products available
              </p>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() =>
              setShowFilters(
                !showFilters
              )
            }
            className="h-11 px-5 bg-white border border-blue-200 rounded-xl text-[14px] font-medium text-gray-800 hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />

            Filters

            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFilters
                  ? 'rotate-180'
                  : ''
              }`}
            />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-10 bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-sm">

            {/* Header */}
            <div className="px-6 py-5 border-b border-blue-50 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">

              <div>
                <h2 className="text-[18px] font-semibold text-gray-900">
                  Filters
                </h2>

                <p className="text-[13px] text-gray-500 mt-1">
                  Refine products instantly
                </p>
              </div>

              <button
                onClick={() =>
                  setShowFilters(false)
                }
                className="w-10 h-10 rounded-xl hover:bg-blue-100 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 grid lg:grid-cols-2 gap-10">

              {/* Categories */}
              <div>

                <h3 className="text-[13px] uppercase tracking-wide font-semibold text-gray-500 mb-4">
                  Categories
                </h3>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      handleCategoryChange(
                        ''
                      )
                    }
                    className={`px-4 h-10 rounded-full text-[14px] font-medium transition-all ${
                      activeCategory ===
                      ''
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-blue-200 text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    All Products
                  </button>

                  {categories.map(
                    (category) => (
                      <button
                        key={category.id}
                        onClick={() =>
                          handleCategoryChange(
                            category.id
                          )
                        }
                        className={`px-4 h-10 rounded-full text-[14px] font-medium transition-all ${
                          activeCategory ===
                          category.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white border border-blue-200 text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        {
                          category.name
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Price Filter */}
              <div>

                <div className="flex items-center justify-between mb-5">

                  <h3 className="text-[13px] uppercase tracking-wide font-semibold text-gray-500">
                    Price Range
                  </h3>

                  <button
                    onClick={() =>
                      setPriceRange({
                        min: absoluteMinPrice,
                        max: absoluteMaxPrice,
                      })
                    }
                    className="text-[13px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    Reset
                  </button>
                </div>

                {/* Price Boxes */}
                <div className="flex items-center gap-4 mb-7">

                  <div className="flex-1">
                    <p className="text-[12px] text-gray-500 mb-2">
                      Minimum
                    </p>

                    <div className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 flex items-center font-semibold text-gray-900">
                      ₹{priceRange.min}
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[12px] text-gray-500 mb-2">
                      Maximum
                    </p>

                    <div className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 flex items-center font-semibold text-gray-900">
                      ₹{priceRange.max}
                    </div>
                  </div>
                </div>

                {/* Slider */}
                <div className="relative h-8">

                  {/* Track */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-[5px] bg-blue-100 rounded-full" />

                  {/* Active */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[5px] bg-blue-600 rounded-full"
                    style={{
                      left: `${
                        ((priceRange.min -
                          absoluteMinPrice) /
                          (absoluteMaxPrice -
                            absoluteMinPrice)) *
                        100
                      }%`,
                      right: `${
                        100 -
                        ((priceRange.max -
                          absoluteMinPrice) /
                          (absoluteMaxPrice -
                            absoluteMinPrice)) *
                          100
                      }%`,
                    }}
                  />

                  {/* Min Slider */}
                  <input
                    type="range"
                    min={
                      absoluteMinPrice
                    }
                    max={
                      absoluteMaxPrice
                    }
                    value={priceRange.min}
                    onChange={(e) =>
                      handleMinChange(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="absolute w-full appearance-none bg-transparent pointer-events-none
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-blue-600
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-white
                    [&::-webkit-slider-thumb]:shadow-md"
                  />

                  {/* Max Slider */}
                  <input
                    type="range"
                    min={
                      absoluteMinPrice
                    }
                    max={
                      absoluteMaxPrice
                    }
                    value={priceRange.max}
                    onChange={(e) =>
                      handleMaxChange(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="absolute w-full appearance-none bg-transparent pointer-events-none
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-blue-600
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-white
                    [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>

                {/* Labels */}
                <div className="flex justify-between mt-3 text-[12px] text-gray-500">
                  <span>
                    ₹
                    {
                      absoluteMinPrice
                    }
                  </span>

                  <span>
                    ₹
                    {
                      absoluteMaxPrice
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-blue-50 bg-blue-50/40 flex items-center justify-between">

              <p className="text-[13px] text-gray-600">
                {
                  displayedProducts.length
                }{' '}
                products found
              </p>

              <button
                onClick={
                  resetFilters
                }
                className="h-10 px-5 rounded-xl bg-blue-600 text-white text-[14px] font-medium hover:bg-blue-700 transition-all shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Products */}
        {displayedProducts.length >
        0 ? (

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

            {displayedProducts.map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              )
            )}
          </div>

        ) : (

          <div className="bg-white border border-blue-100 rounded-3xl py-20 text-center shadow-sm">

            <Package className="w-16 h-16 text-blue-200 mx-auto mb-5" />

            <h3 className="text-[22px] font-semibold text-gray-900 mb-2">
              No products found
            </h3>

            <p className="text-[14px] text-gray-500 mb-6">
              Try adjusting your
              filters
            </p>

            <button
              onClick={
                resetFilters
              }
              className="h-11 px-6 rounded-xl bg-blue-600 text-white text-[14px] font-medium hover:bg-blue-700 transition-all shadow-sm"
            >
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
        <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}