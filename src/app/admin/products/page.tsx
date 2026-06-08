'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Pencil } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  productCode?: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  mrpPrice?: number;
  unit: string;
  category: string;
  moq?: number;
  stockStatus: 'in_stock' | 'low' | 'out';
  stockQuantity?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'carpentry':             'Carpentry',
  'paints':                'Paints & Polish',
  'paints_and_polish':     'Paints & Polish',
  'plumbing':              'Plumbing',
  'civil-materials':       'Civil Materials',
  'civil_materials':       'Civil Materials',
  'electrical':            'Electrical',
  'flooring-ceilings':     'Flooring & Ceilings',
  'flooring_and_ceilings': 'Flooring & Ceilings',
  'glass-aluminium':       'Glass & Aluminium',
  'glass_and_aluminium':   'Glass & Aluminium',
  'tools-machines':        'Tools & Machines',
  'tools_and_machines':    'Tools & Machines',
};

export default function ProductsPage() {
  const [categories, setCategories]         = useState<CategoryOption[]>([]);
  const [activeSlug, setActiveSlug]         = useState<string>('all');
  const [products, setProducts]             = useState<Product[]>([]);
  const [total, setTotal]                   = useState(0);
  const [loadingCats, setLoadingCats]       = useState(true);
  const [loadingProds, setLoadingProds]     = useState(true);
  // Cache: slug → { products, total }
  const [cache, setCache]                   = useState<Record<string, { products: Product[]; total: number }>>({});

  // Load categories once
  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.data.categories);
      })
      .finally(() => setLoadingCats(false));
  }, []);

  // Fetch products for the active tab
  const loadProducts = useCallback(
    (slug: string) => {
      if (cache[slug]) {
        setProducts(cache[slug].products);
        setTotal(cache[slug].total);
        return;
      }
      setLoadingProds(true);
      const url =
        slug === 'all'
          ? '/api/products?limit=500'
          : `/api/products?category=${slug}&limit=500`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const p = data.data.products as Product[];
            const t = data.data.total as number;
            setProducts(p);
            setTotal(t);
            setCache((prev) => ({ ...prev, [slug]: { products: p, total: t } }));
          }
        })
        .finally(() => setLoadingProds(false));
    },
    [cache]
  );

  // Load products whenever active tab changes
  useEffect(() => {
    loadProducts(activeSlug);
  }, [activeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTab = (slug: string) => {
    if (slug === activeSlug) return;
    setProducts([]);
    setActiveSlug(slug);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Products</h1>
          <p className="text-brand-slate text-sm">
            {loadingProds ? 'Loading…' : `${products.length} of ${total} products`}
            {activeSlug !== 'all' && (
              <span className="ml-1 text-brand-steel">
                in{' '}
                <span className="font-medium text-brand-charcoal">
                  {CATEGORY_LABELS[activeSlug] ?? activeSlug}
                </span>
              </span>
            )}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* ── Category tabs ────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {/* All tab */}
        <button
          onClick={() => handleTab('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
            activeSlug === 'all'
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-white text-brand-slate hover:text-brand-charcoal border-neutral-200 hover:border-brand-primary/40'
          }`}
        >
          All
        </button>

        {loadingCats ? (
          <span className="px-4 py-1.5 text-sm text-brand-steel">Loading categories…</span>
        ) : (
          categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleTab(cat.slug)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeSlug === cat.slug
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-brand-slate hover:text-brand-charcoal border-neutral-200 hover:border-brand-primary/40'
              }`}
            >
              {cat.name}
            </button>
          ))
        )}
      </div>

      {/* ── Products table ───────────────────────────────────────── */}
      {loadingProds ? (
        <div className="card p-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-brand-steel">Loading products…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <p className="text-brand-steel font-medium">No products in this category yet</p>
          <Link href="/admin/products/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-fog border-b border-neutral-100">
              <tr>
                {['Code', 'Product', 'Brand', 'Sub-category', 'Price', 'MRP', 'MOQ', 'Stock', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-brand-slate uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((product) => (
                <tr
                  key={product.productCode ?? product.id}
                  className="hover:bg-brand-fog/60 transition-colors"
                >
                  {/* Code */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-neutral-100 text-brand-graphite px-1.5 py-0.5 rounded">
                      {product.productCode ?? product.id}
                    </span>
                  </td>

                  {/* Name + description */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-semibold text-brand-charcoal line-clamp-1">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-brand-steel line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3 text-brand-graphite whitespace-nowrap">
                    {product.brand ?? <span className="text-brand-steel">—</span>}
                  </td>

                  {/* Sub-category slug */}
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs bg-neutral-100 text-brand-graphite px-2 py-0.5 rounded-full whitespace-nowrap">
                      {product.category}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 font-semibold text-brand-charcoal whitespace-nowrap">
                    ₹{product.price.toLocaleString('en-IN')}
                    <span className="text-xs text-brand-steel font-normal ml-0.5">/{product.unit}</span>
                  </td>

                  {/* MRP */}
                  <td className="px-4 py-3 text-brand-steel whitespace-nowrap">
                    {product.mrpPrice
                      ? `₹${product.mrpPrice.toLocaleString('en-IN')}`
                      : <span className="text-neutral-300">—</span>}
                  </td>

                  {/* MOQ */}
                  <td className="px-4 py-3 text-brand-graphite text-center">{product.moq ?? 1}</td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-center">
                    {product.stockQuantity !== undefined ? (
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                        product.stockQuantity > 10
                          ? 'bg-green-100 text-green-700'
                          : product.stockQuantity > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stockQuantity}
                      </span>
                    ) : (
                      <span className="text-neutral-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/products/${encodeURIComponent(product.productCode ?? product.id)}/edit`}
                        className="p-1.5 rounded-lg text-brand-steel hover:text-brand-primary hover:bg-primary-50 inline-flex transition-all"
                        title="Edit product"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/product/${product.productCode ?? product.id}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-brand-steel hover:text-brand-charcoal hover:bg-neutral-100 inline-flex transition-all"
                        title="View in catalog"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer row */}
          <div className="px-4 py-3 border-t border-neutral-100 bg-brand-fog text-xs text-brand-steel">
            Showing {products.length} of {total} products
            {activeSlug !== 'all' && ` in ${CATEGORY_LABELS[activeSlug] ?? activeSlug}`}
          </div>
        </div>
      )}
    </div>
  );
}
