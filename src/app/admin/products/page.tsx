'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Pencil, Trash2, Archive, RotateCcw, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

// Mirrors LOW_STOCK_THRESHOLD in lib/products.ts (not imported: that module is server-only).
const LOW_STOCK_THRESHOLD = 10;
type StockFilter = 'out' | 'low';

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
  isFlashSale?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  // Size family (migration 028)
  familyId?: string;
  familySize?: number;
  optionLabel?: string;
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

// "discontinue" hides a product from the store but keeps it (reversible);
// "delete" removes it for good and is only offered once it's discontinued.
type PendingAction =
  | { kind: 'discontinue' | 'restore' | 'delete'; productCode: string; name: string }
  | null;

export default function ProductsPage() {
  const [categories, setCategories]       = useState<CategoryOption[]>([]);
  const [activeSlug, setActiveSlug]       = useState<string>('all');
  const [searchText, setSearchText]       = useState('');
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(50);
  const [products, setProducts]           = useState<Product[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loadingCats, setLoadingCats]     = useState(true);
  const [loadingProds, setLoadingProds]   = useState(true);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [working, setWorking]             = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);
  // null until the URL has been read, so the first fetch already uses ?stock=
  // from a dashboard "Out of stock" link instead of loading everything first.
  const [stockFilter, setStockFilter]     = useState<StockFilter | 'all' | null>(null);
  const [stockAlerts, setStockAlerts]     = useState<{ outOfStock: number; lowStock: number } | null>(null);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('stock');
      setStockFilter(fromUrl === 'out' || fromUrl === 'low' ? fromUrl : 'all');
    } catch {
      setStockFilter('all');
    }
  }, []);

  // Load categories once
  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.data.categories);
      })
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, []);

  // Debounce the search box.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  // Fetch products - always fresh, no caching. Uses the admin endpoint so
  // inactive/discontinued products are listed too.
  const loadProducts = useCallback((slug: string, term: string, pageNum: number, stock: StockFilter | 'all') => {
    setLoadingProds(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (slug !== 'all') params.set('category', slug);
    if (term) params.set('search', term);
    if (stock !== 'all') params.set('stock', stock);
    if (pageNum > 1) params.set('page', String(pageNum));
    fetch(`/admin/api/products?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Failed to load products');
        setProducts(data.data.products as Product[]);
        setTotal(data.data.total as number);
        if (data.data.pageSize) setPageSize(data.data.pageSize as number);
        if (data.data.stockAlerts) setStockAlerts(data.data.stockAlerts);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoadingProds(false));
  }, []);

  useEffect(() => {
    if (stockFilter === null) return; // wait until ?stock= has been read
    loadProducts(activeSlug, search, page, stockFilter);
  }, [activeSlug, search, page, stockFilter, loadProducts]);

  const handleTab = (slug: string) => {
    if (slug === activeSlug) {
      loadProducts(slug, search, page, stockFilter ?? 'all'); // re-fetch even if same tab selected
      return;
    }
    setProducts([]);
    setPage(1);
    setActiveSlug(slug);
  };

  const handleStockFilter = (value: StockFilter | 'all') => {
    setPage(1);
    setStockFilter(value);
    // Keep the URL in sync so the filtered view can be bookmarked/shared.
    try {
      const url = new URL(window.location.href);
      if (value === 'all') url.searchParams.delete('stock');
      else url.searchParams.set('stock', value);
      window.history.replaceState(null, '', url);
    } catch { /* non-essential */ }
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    setWorking(true);
    setActionError(null);
    const { kind, productCode, name } = pendingAction;
    try {
      const url = `/admin/api/products/${encodeURIComponent(productCode)}`;
      const res = kind === 'delete'
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: kind === 'discontinue' ? 'discontinued' : 'active' }),
          });
      const data = await res.json().catch(() => ({}));
      if (!data.success) throw new Error(data.error || 'Something went wrong');

      if (kind === 'delete') {
        setProducts((prev) => prev.filter((p) => (p.productCode ?? p.id) !== productCode));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        const status = kind === 'discontinue' ? 'discontinued' : 'active';
        setProducts((prev) => prev.map((p) => ((p.productCode ?? p.id) === productCode ? { ...p, status } : p)));
      }
    } catch (err) {
      setActionError(`"${name}": ${err instanceof Error ? err.message : 'action failed'}`);
    } finally {
      setWorking(false);
      setPendingAction(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Products</h1>
          <p className="text-brand-slate text-sm">
            {loadingProds ? 'Loading…' : `${total.toLocaleString('en-IN')} products`}
            {activeSlug !== 'all' && (
              <span className="ml-1 text-brand-steel">
                in{' '}
                <span className="font-medium text-brand-charcoal">
                  {CATEGORY_LABELS[activeSlug] ?? activeSlug}
                </span>
              </span>
            )}
            {search && <span className="ml-1 text-brand-steel">matching &ldquo;{search}&rdquo;</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={'/admin/products/families' as any} className="btn-secondary">
            <Layers className="w-4 h-4" />
            Size families
          </Link>
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* ── Search + stock filter ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, brand or product code"
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-white text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'All stock' },
            { key: 'out', label: `Out of stock${stockAlerts ? ` (${stockAlerts.outOfStock})` : ''}` },
            { key: 'low', label: `Low stock${stockAlerts ? ` (${stockAlerts.lowStock})` : ''}` },
          ] as const).map(({ key, label }) => {
            const active = (stockFilter ?? 'all') === key;
            const alert = key === 'out' && (stockAlerts?.outOfStock ?? 0) > 0;
            return (
              <button
                key={key}
                onClick={() => handleStockFilter(key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  active
                    ? key === 'out' ? 'bg-red-600 text-white border-red-600' : 'bg-brand-primary text-white border-brand-primary'
                    : alert
                      ? 'bg-red-50 text-red-700 border-red-200 hover:border-red-400'
                      : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary/40'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {stockFilter && stockFilter !== 'all' && (
        <p className="text-xs text-brand-steel -mt-2">
          Showing active products with {stockFilter === 'out' ? 'no stock left' : `1-${LOW_STOCK_THRESHOLD} units left`}.
          Update the count from the product&apos;s edit page once restocked.
        </p>
      )}

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

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* ── Products table ───────────────────────────────────────── */}
      {loadingProds ? (
        <div className="card p-16 text-center">
          <div className="inline-block w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-brand-steel">Loading products…</p>
        </div>
      ) : loadError ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-red-700 font-medium">{loadError}</p>
          <button onClick={() => loadProducts(activeSlug, search, page, stockFilter ?? 'all')} className="btn-secondary inline-flex">Try again</button>
        </div>
      ) : products.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <p className="text-brand-steel font-medium">
            {stockFilter === 'out'
              ? 'No active products are out of stock'
              : stockFilter === 'low'
                ? 'No active products are low on stock'
                : search ? 'No products match your search' : 'No products in this category yet'}
          </p>
          <Link href="/admin/products/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Phones: one card per product - the 9-column table only fits from md up */}
          <div className="md:hidden divide-y divide-neutral-100">
            {products.map((product) => {
              const code = product.productCode ?? product.id;
              const discontinued = product.status === 'discontinued';
              return (
                <div key={code} className={`px-4 py-3 ${discontinued ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/products/${encodeURIComponent(code)}/edit`} className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-brand-charcoal line-clamp-2">
                        {product.name}
                        {product.isFlashSale && (
                          <span className="ml-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 align-middle">🔥 SALE</span>
                        )}
                        {product.status && product.status !== 'active' && (
                          <span className="ml-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-brand-graphite uppercase align-middle">{product.status}</span>
                        )}
                      </p>
                      <p className="text-xs text-brand-steel mt-0.5">
                        <span className="font-mono">{code}</span>
                        {product.brand && ` · ${product.brand}`}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-semibold text-brand-charcoal">₹{product.price.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-brand-steel">/{product.unit}</span>
                        {product.mrpPrice ? <span className="text-xs text-brand-steel line-through ml-1.5">₹{product.mrpPrice.toLocaleString('en-IN')}</span> : null}
                        <span className="text-xs text-brand-steel ml-1.5">· MOQ {product.moq ?? 1}</span>
                      </p>
                    </Link>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <StockBadge quantity={product.stockQuantity} />
                      <ProductRowActions code={code} name={product.name} discontinued={discontinued} onAction={setPendingAction} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-brand-fog border-b border-neutral-100">
                <tr>
                  {['Code', 'Product', 'Brand', 'Sub-category', 'Price', 'MRP', 'MOQ', 'Stock (manual)', ''].map((h) => (
                    <th
                      key={h}
                      title={h === 'Stock (manual)' ? 'Set by admins on the edit page - orders do not reduce it automatically.' : undefined}
                      className="text-left px-4 py-3 text-xs font-semibold text-brand-slate uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => {
                  const code = product.productCode ?? product.id;
                  const discontinued = product.status === 'discontinued';
                  return (
                    <tr
                      key={code}
                      className={`hover:bg-brand-fog/60 transition-colors ${discontinued ? 'opacity-60' : ''}`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-neutral-100 text-brand-graphite px-1.5 py-0.5 rounded">
                          {code}
                        </span>
                      </td>

                      {/* Name + description */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-brand-charcoal line-clamp-1 flex items-center gap-1.5">
                          {product.name}
                          {product.isFlashSale && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">
                              🔥 SALE
                            </span>
                          )}
                          {product.familyId && (
                            <Link
                              href={`/admin/products/${encodeURIComponent(code)}/edit#sizes` as any}
                              title={`Size "${product.optionLabel}" in a family of ${product.familySize} - edit sizes`}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-50 text-brand-dark flex-shrink-0 hover:bg-primary-100"
                            >
                              <Layers className="w-3 h-3" />
                              {product.optionLabel}
                            </Link>
                          )}
                          {product.status && product.status !== 'active' && (
                            <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 uppercase ${
                              product.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' : 'bg-neutral-200 text-brand-graphite'
                            }`}>
                              {product.status}
                            </span>
                          )}
                        </p>
                        {product.description && (
                          <p className="text-xs text-brand-steel line-clamp-1 mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 text-brand-graphite whitespace-nowrap">
                        {product.brand ?? <span className="text-brand-steel">-</span>}
                      </td>

                      {/* Sub-category slug */}
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs bg-neutral-100 text-brand-graphite px-2 py-0.5 rounded-full whitespace-nowrap">
                          {CATEGORY_LABELS[product.category] ?? product.category}
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
                          : <span className="text-neutral-300">-</span>}
                      </td>

                      {/* MOQ */}
                      <td className="px-4 py-3 text-brand-graphite text-center">{product.moq ?? 1}</td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-center">
                        <StockBadge quantity={product.stockQuantity} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <ProductRowActions code={code} name={product.name} discontinued={discontinued} onAction={setPendingAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer row + pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100 bg-brand-fog text-xs text-brand-steel">
            <span>
              Showing {firstShown}-{lastShown} of {total.toLocaleString('en-IN')} products
              {activeSlug !== 'all' && ` in ${CATEGORY_LABELS[activeSlug] ?? activeSlug}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary disabled:opacity-40"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation dialogs ─────────────────────────────────── */}
      {pendingAction?.kind === 'delete' && (
        <ConfirmDeleteModal
          title="Delete product permanently?"
          message={`"${pendingAction.name}" will be permanently removed from the catalog, inventory, and all related data. Past orders keep their item names and prices. This cannot be undone.`}
          pending={working}
          onCancel={() => setPendingAction(null)}
          onConfirm={runPendingAction}
        />
      )}
      {(pendingAction?.kind === 'discontinue' || pendingAction?.kind === 'restore') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-brand-charcoal mb-2">
              {pendingAction.kind === 'discontinue' ? 'Discontinue product?' : 'Restore product?'}
            </h2>
            <p className="text-sm text-brand-slate mb-5">
              {pendingAction.kind === 'discontinue'
                ? <>&ldquo;{pendingAction.name}&rdquo; will be hidden from the store. You can restore it any time, or delete it permanently afterwards.</>
                : <>&ldquo;{pendingAction.name}&rdquo; will be set to active and shown in the store again.</>}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingAction(null)}
                disabled={working}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-brand-charcoal font-semibold text-sm hover:bg-neutral-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={runPendingAction}
                disabled={working}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {working ? 'Saving…' : pendingAction.kind === 'discontinue' ? 'Discontinue' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockBadge({ quantity }: { quantity?: number }) {
  if (quantity === undefined) return <span className="text-neutral-300 text-xs">-</span>;
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
      quantity > LOW_STOCK_THRESHOLD
        ? 'bg-green-100 text-green-700'
        : quantity > 0
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700'
    }`}>
      {quantity}
    </span>
  );
}

function ProductRowActions({ code, name, discontinued, onAction }: {
  code: string;
  name: string;
  discontinued: boolean;
  onAction: (action: PendingAction) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/products/${encodeURIComponent(code)}/edit`}
        className="p-1.5 rounded-lg text-brand-steel hover:text-brand-primary hover:bg-primary-50 inline-flex transition-all"
        title="Edit product"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <Link
        href={`/product/${code}`}
        target="_blank"
        className="p-1.5 rounded-lg text-brand-steel hover:text-brand-charcoal hover:bg-neutral-100 inline-flex transition-all"
        title="View in catalog"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
      {discontinued ? (
        <>
          <button
            onClick={() => onAction({ kind: 'restore', productCode: code, name })}
            className="p-1.5 rounded-lg text-brand-steel hover:text-green-700 hover:bg-green-50 inline-flex transition-all"
            title="Restore (make active again)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction({ kind: 'delete', productCode: code, name })}
            className="p-1.5 rounded-lg text-brand-steel hover:text-red-600 hover:bg-red-50 inline-flex transition-all"
            title="Delete permanently"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button
          onClick={() => onAction({ kind: 'discontinue', productCode: code, name })}
          className="p-1.5 rounded-lg text-brand-steel hover:text-red-600 hover:bg-red-50 inline-flex transition-all"
          title="Discontinue (hide from store)"
        >
          <Archive className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}