# ProductFilterBar Component Documentation

## Overview

`ProductFilterBar` is a fully-featured, production-ready product filtering and sorting component for e-commerce applications. It provides both desktop and mobile-responsive interfaces with comprehensive filtering options.

## Component Location

```
src/components/ProductFilterBar.tsx
```

## Features

### Sort Options (7 variants)
1. **Recommended** - Default sorting
2. **Best Selling** - Sorted by sales volume
3. **New Arrivals** - Latest products first
4. **Price: Low to High** - Ascending price
5. **Price: High to Low** - Descending price
6. **Highest Rated** - By customer ratings
7. **Discount %: High to Low** - By discount percentage

### Filter Capabilities

| Filter | Type | Options |
|--------|------|---------|
| Price Range | Range Slider | Min/Max input |
| Category | Checkboxes | Dynamic list |
| Brand | Checkboxes | Dynamic list |
| Rating | Star-based | 3★, 4★ & above |
| Discount | Percentage | 10%+, 20%+, 30%+, 50%+ |
| Availability | Toggle | In Stock Only |

### UI Features

- **Active Filter Chips**: Visual tags showing applied filters with remove buttons
- **Clear All Filters**: Reset all filters with one click
- **Product Count**: Display total results count
- **Mobile Drawer**: Collapsible filter panel on small screens
- **Sort Dropdown**: Always accessible desktop sort menu

## Types

```typescript
// Sort options type
export type SortOption = 
  | 'recommended'
  | 'best_selling'
  | 'new_arrivals'
  | 'price_low_high'
  | 'price_high_low'
  | 'highest_rated'
  | 'discount_high_low';

// Complete filter state
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

// Component props
export interface ProductFilterBarProps {
  productCount?: number;
  categories?: Array<{ id: string; name: string }>;
  brands?: string[];
  onFilterChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}
```

## Usage Example

### Basic Usage

```tsx
import { ProductFilterBar } from '@/components/ProductFilterBar';
import { useState } from 'react';

export default function CatalogPage() {
  const [filters, setFilters] = useState(null);

  return (
    <div>
      <ProductFilterBar
        productCount={240}
        categories={[
          { id: 'carpentry', name: 'Carpentry' },
          { id: 'plumbing', name: 'Plumbing' },
        ]}
        brands={['Stanley', 'DeWalt', 'Bosch']}
        onFilterChange={(filters) => {
          setFilters(filters);
          // Fetch filtered products from API
        }}
      />
      
      {/* Render filtered products below */}
    </div>
  );
}
```

### With Initial Filters

```tsx
<ProductFilterBar
  productCount={50}
  categories={categories}
  brands={brands}
  onFilterChange={handleFilterChange}
  initialFilters={{
    sort: 'price_low_high',
    priceRange: { min: 100, max: 5000 },
    categories: ['carpentry'],
    brands: [],
    minRating: 0,
    minDiscount: 0,
    inStockOnly: true,
  }}
/>
```

## Props Reference

### `productCount` (optional)
- **Type**: `number`
- **Default**: `0`
- **Description**: Total number of products matching filters

### `categories` (optional)
- **Type**: `Array<{ id: string; name: string }>`
- **Default**: FastGet's default categories (Carpentry, Plumbing, Hardware, Electrical, Adhesives)
- **Description**: Available product categories for filtering

### `brands` (optional)
- **Type**: `string[]`
- **Default**: `['Brand A', 'Brand B', 'Brand C', 'Brand D']`
- **Description**: Available brands for filtering

### `onFilterChange` (optional)
- **Type**: `(filters: FilterState) => void`
- **Default**: `undefined`
- **Description**: Callback fired whenever any filter changes. Receives complete FilterState object.

### `initialFilters` (optional)
- **Type**: `Partial<FilterState>`
- **Default**: All filters disabled/default values
- **Description**: Set initial filter state (sort, price range, selected categories, etc.)

## Filter State Structure

The component emits a `FilterState` object whenever filters change:

```typescript
{
  sort: 'price_low_high',                    // Current sort option
  priceRange: {
    min: 500,                                // Minimum price
    max: 5000                                // Maximum price
  },
  categories: ['plumbing', 'electrical'],    // Selected category IDs
  brands: ['Stanley', 'DeWalt'],            // Selected brands
  minRating: 4,                              // Minimum rating (0 = no filter)
  minDiscount: 20,                           // Minimum discount % (0 = no filter)
  inStockOnly: true                          // In stock only toggle
}
```

## Styling

- **Tailwind CSS** for all styling
- **Blue color scheme** consistent with FastGet design
- **Lucide React icons** for visual elements
- **Mobile-first responsive design**

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Filters in slide-in drawer, sort dropdown only |
| Tablet (≥ 640px) | Horizontal filter bar with all options visible |
| Desktop (≥ 1024px) | Full filter grid with 5-column layout |

## Mobile Behavior

1. **Sort Button**: Always visible, opens dropdown
2. **Filter Button**: Shows active filter count badge
3. **Filters Drawer**: Slides in from right side with backdrop
4. **Touch-friendly**: Larger tap targets (44px+)

## Desktop Behavior

1. **Sort Dropdown**: Full label visible
2. **Filter Sections**: Collapsible with expand/collapse arrows
3. **Active Chips**: Always visible above filters
4. **No Drawer**: All filters visible inline

## Integration with API

```tsx
async function fetchProducts(filters: FilterState) {
  const queryParams = new URLSearchParams({
    sort: filters.sort,
    priceMin: filters.priceRange.min.toString(),
    priceMax: filters.priceRange.max.toString(),
    categories: filters.categories.join(','),
    brands: filters.brands.join(','),
    minRating: filters.minRating.toString(),
    minDiscount: filters.minDiscount.toString(),
    inStock: filters.inStockOnly.toString(),
  });

  const response = await fetch(`/api/products?${queryParams}`);
  return response.json();
}

// In component
<ProductFilterBar
  onFilterChange={async (filters) => {
    const products = await fetchProducts(filters);
    setProducts(products);
  }}
/>
```

## Customization

### Custom Categories/Brands

Pass custom lists to override defaults:

```tsx
<ProductFilterBar
  categories={[
    { id: 'custom1', name: 'My Category' },
    { id: 'custom2', name: 'Another Category' },
  ]}
  brands={['My Brand 1', 'My Brand 2']}
/>
```

### Custom Price Range

Set via `initialFilters`:

```tsx
<ProductFilterBar
  initialFilters={{
    priceRange: { min: 0, max: 100000 }
  }}
/>
```

### Styling Customization

The component uses standard Tailwind classes. To customize colors, modify:

1. Replace `bg-blue-600` with your primary color class
2. Replace `text-blue-700` with your secondary color
3. Update border colors (`border-gray-200`, etc.)

Example override via CSS:

```css
/* In globals.css */
.product-filter-bar {
  --primary-color: rgb(59, 130, 246);
}
```

## Accessibility

- ✅ Semantic HTML (label, checkbox, input elements)
- ✅ ARIA attributes for screen readers
- ✅ Keyboard navigation support
- ✅ High contrast colors (WCAG AA compliant)
- ✅ Focus indicators on all interactive elements

## Performance Considerations

- Uses `useCallback` to prevent unnecessary re-renders
- Efficient event handlers
- Lightweight Tailwind styling (no CSS-in-JS overhead)
- Minimal re-renders on filter changes

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Common Use Cases

### 1. E-commerce Catalog Page
```tsx
<ProductFilterBar
  productCount={results.length}
  onFilterChange={(filters) => updateCatalog(filters)}
/>
```

### 2. Search Results Page
```tsx
<ProductFilterBar
  productCount={searchResults.length}
  onFilterChange={(filters) => filterSearchResults(filters)}
/>
```

### 3. Category Page with Pre-filtered Data
```tsx
<ProductFilterBar
  initialFilters={{ categories: ['plumbing'] }}
  productCount={plumbingProducts.length}
/>
```

## Troubleshooting

### Filters not updating
- Ensure `onFilterChange` callback is provided
- Check that state is being updated in parent component

### Styles not applying
- Verify Tailwind CSS is properly configured
- Check for CSS conflicts with custom stylesheets

### Mobile drawer not appearing
- Verify component is marked with `'use client'`
- Check viewport meta tag in layout

## Future Enhancements

- [ ] Price range slider component
- [ ] Multi-select dropdown for categories
- [ ] Advanced search text input
- [ ] Sort preset combinations
- [ ] Filter presets/saved filters
- [ ] Analytics tracking integration

---

**Component Version**: 1.0.0  
**Last Updated**: 2026-05-08  
**Maintained by**: FastGet Development Team
