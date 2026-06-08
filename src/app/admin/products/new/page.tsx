'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

const STATUS_OPTIONS = [
  { value: 'active',        label: 'Active' },
  { value: 'inactive',      label: 'Inactive' },
  { value: 'discontinued',  label: 'Discontinued' },
];

const UOM_OPTIONS = [
  'piece', 'bag', 'kg', 'gram', 'litre', 'ml',
  'metre', 'sqft', 'sqmtr', 'rft', 'box', 'set', 'pair', 'roll',
];

const inputCls =
  'mt-1.5 w-full rounded-xl border border-neutral-200 bg-brand-fog px-4 py-2.5 text-sm text-brand-charcoal placeholder-brand-steel transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:bg-white';

const labelCls = 'block text-xs font-semibold text-brand-graphite uppercase tracking-wide';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [formData, setFormData] = useState({
    name:          '',
    brand:         '',
    description:   '',
    price:         '',
    mrpPrice:      '',
    categorySlug:  '',
    uom:           '',
    productCode:   '',
    imageUrl:      '',
    sku:           '',
    stockQuantity: '0',
    moq:           '1',
    status:        'active',
  });

  // Load categories from DB on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.categories?.length) {
          setCategories(data.data.categories);
          setFormData((prev) => ({ ...prev, categorySlug: data.data.categories[0].slug }));
        }
      })
      .catch(() => {/* categories stay empty, dropdown shows fallback */});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      setLoading(false);
      return;
    }
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      setError('Selling price must be greater than 0');
      setLoading(false);
      return;
    }
    if (!formData.categorySlug) {
      setError('Please select a category');
      setLoading(false);
      return;
    }

    const selectedCategory = categories.find((c) => c.slug === formData.categorySlug);

    try {
      const payload = {
        name:          formData.name.trim(),
        brand:         formData.brand.trim()       || undefined,
        description:   formData.description.trim() || undefined,
        price,
        mrpPrice:      formData.mrpPrice ? parseFloat(formData.mrpPrice) : undefined,
        categorySlug:  formData.categorySlug,
        categoryName:  selectedCategory?.name,
        uom:           formData.uom                || undefined,
        productCode:   formData.productCode.trim() || undefined,
        imageUrl:      formData.imageUrl.trim()    || undefined,
        sku:           formData.sku.trim()         || undefined,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        moq:           parseInt(formData.moq) || 1,
        status:        formData.status,
      };

      const response = await fetch('/admin/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Add New Product</h1>
          <p className="mt-1 text-sm text-brand-slate">Fill in the details to add a product to the database</p>
        </div>
        <Link href="/admin/products" className="text-brand-steel hover:text-brand-charcoal transition-colors text-lg">
          ✕
        </Link>
      </div>

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          <p className="font-semibold">Product created successfully!</p>
          <p>Redirecting to products list…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Product Details ─────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Product Details
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="name" className={labelCls}>
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange}
                placeholder="e.g., Teak Wood Plank"
                className={inputCls} disabled={loading} required
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="brand" className={labelCls}>Brand</label>
              <input
                type="text" id="brand" name="brand"
                value={formData.brand} onChange={handleChange}
                placeholder="e.g., CenturyPly"
                className={inputCls} disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelCls}>Description</label>
            <textarea
              id="description" name="description"
              value={formData.description} onChange={handleChange}
              placeholder="Describe the product features and specifications…"
              rows={3} className={`${inputCls} resize-none`} disabled={loading}
            />
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Pricing
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className={labelCls}>
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" id="price" name="price"
                value={formData.price} onChange={handleChange}
                placeholder="0.00" step="0.01" min="0.01"
                className={inputCls} disabled={loading} required
              />
            </div>
            <div>
              <label htmlFor="mrpPrice" className={labelCls}>MRP / List Price (₹)</label>
              <input
                type="number" id="mrpPrice" name="mrpPrice"
                value={formData.mrpPrice} onChange={handleChange}
                placeholder="0.00" step="0.01" min="0"
                className={inputCls} disabled={loading}
              />
              <p className="mt-1 text-xs text-brand-steel">Optional — shown as strikethrough price</p>
            </div>
          </div>
        </section>

        {/* ── Classification ──────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Classification
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="categorySlug" className={labelCls}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="categorySlug" name="categorySlug"
                value={formData.categorySlug} onChange={handleChange}
                className={inputCls} disabled={loading || categories.length === 0} required
              >
                {categories.length === 0 && (
                  <option value="">Loading categories…</option>
                )}
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="uom" className={labelCls}>Unit of Measure</label>
              <select
                id="uom" name="uom"
                value={formData.uom} onChange={handleChange}
                className={inputCls} disabled={loading}
              >
                <option value="">Select unit…</option>
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="productCode" className={labelCls}>Product Code / ID</label>
            <input
              type="text" id="productCode" name="productCode"
              value={formData.productCode} onChange={handleChange}
              placeholder="e.g., PLY-CP-04 (auto-generated if blank)"
              className={inputCls} disabled={loading}
            />
            <p className="mt-1 text-xs text-brand-steel">
              Stable identifier used in product URLs. Auto-generated from category + timestamp if left blank.
            </p>
          </div>
        </section>

        {/* ── Inventory ───────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Inventory
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="sku" className={labelCls}>SKU</label>
              <input
                type="text" id="sku" name="sku"
                value={formData.sku} onChange={handleChange}
                placeholder="Auto-generated if blank"
                className={inputCls} disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="stockQuantity" className={labelCls}>Stock Qty</label>
              <input
                type="number" id="stockQuantity" name="stockQuantity"
                value={formData.stockQuantity} onChange={handleChange}
                min="0" step="1"
                className={inputCls} disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="moq" className={labelCls}>Min. Order Qty</label>
              <input
                type="number" id="moq" name="moq"
                value={formData.moq} onChange={handleChange}
                min="1" step="1"
                className={inputCls} disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* ── Media & Status ──────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Media &amp; Status
          </h2>

          <div>
            <label htmlFor="imageUrl" className={labelCls}>Image URL</label>
            <input
              type="url" id="imageUrl" name="imageUrl"
              value={formData.imageUrl} onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className={inputCls} disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="status" className={labelCls}>Status</label>
            <select
              id="status" name="status"
              value={formData.status} onChange={handleChange}
              className={inputCls} disabled={loading}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Link href="/admin/products" className="btn-secondary flex-1 py-2.5 justify-center text-center">
            Cancel
          </Link>
          <button
            type="submit" disabled={loading || categories.length === 0}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
