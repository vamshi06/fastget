'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { products, categories, searchProducts, getProductsByCategory } from '@/data/products';
import { Product, CategoryId } from '@/types';
import { Package, SlidersHorizontal } from 'lucide-react';

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(products);
  const [activeCategory, setActiveCategory] = useState<CategoryId | ''>(initialCategory as CategoryId | '');
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) {
      const results = searchProducts(initialQuery);
      setDisplayedProducts(results);
      setSearchQuery(initialQuery);
    } else if (initialCategory) {
      const results = getProductsByCategory(initialCategory);
      setDisplayedProducts(results);
      setActiveCategory(initialCategory as CategoryId);
    }
  }, [initialQuery, initialCategory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveCategory('');
    if (query.trim()) {
      setDisplayedProducts(searchProducts(query));
    } else {
      setDisplayedProducts(products);
    }
  };

  const handleCategoryChange = (categoryId: CategoryId | '') => {
    setActiveCategory(categoryId);
    setSearchQuery('');
    if (categoryId) {
      setDisplayedProducts(getProductsByCategory(categoryId));
    } else {
      setDisplayedProducts(products);
    }
  };

  const activeCategoryName = activeCategory
    ? categories.find(c => c.id === activeCategory)?.name
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Catalog</h1>
          <p className="text-gray-600 mb-6">
            Browse our selection of urgent building materials for your site
          </p>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search products..."
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filter by Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          {searchQuery ? (
            <p className="text-gray-600">
              {displayedProducts.length} result{displayedProducts.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          ) : activeCategoryName ? (
            <p className="text-gray-600">
              Showing {displayedProducts.length} products in {activeCategoryName}
            </p>
          ) : (
            <p className="text-gray-600">
              {displayedProducts.length} products available
            </p>
          )}
        </div>

        {displayedProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">
              Try adjusting your search or browse all categories
            </p>
            <button
              onClick={() => handleCategoryChange('')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <CatalogPageContent />
    </Suspense>
  );
}
