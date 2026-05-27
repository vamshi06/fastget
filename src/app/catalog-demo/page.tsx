'use client';

import { ProductFilterBar, FilterState } from '@/components/ProductFilterBar';
import { useState } from 'react';

export default function CatalogPage() {
  const [filters, setFilters] = useState<FilterState | null>(null);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log('Filters updated:', newFilters);
    // Here you would typically:
    // 1. Make an API call to fetch filtered products
    // 2. Update the products display
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Bar */}
      <ProductFilterBar
        productCount={240}
        categories={[
          { id: 'carpentry', name: 'Carpentry' },
          { id: 'plumbing', name: 'Plumbing' },
          { id: 'hardware', name: 'Hardware' },
          { id: 'electrical', name: 'Electrical' },
          { id: 'adhesives', name: 'Adhesives' },
        ]}
        brands={['Stanley', 'DeWalt', 'Bosch', 'Makita', 'Milwaukee']}
        onFilterChange={handleFilterChange}
        initialFilters={{
          sort: 'recommended',
          priceRange: { min: 0, max: 10000 },
          categories: [],
          brands: [],
          minRating: 0,
          minDiscount: 0,
          inStockOnly: false,
        }}
      />

      {/* Products Grid - Placeholder */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Product Name</h3>
                <p className="text-sm text-gray-600 mb-3">Product description</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-brand-primary">₹999</span>
                  <button className="px-3 py-1 bg-brand-primary text-white text-sm rounded hover:bg-brand-dark">
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      {filters && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-xs overflow-auto max-h-64 shadow-lg">
          <h4 className="font-bold mb-2">Current Filters:</h4>
          <pre>{JSON.stringify(filters, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
