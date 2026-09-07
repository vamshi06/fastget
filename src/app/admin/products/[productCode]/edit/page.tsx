'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const inputCls =
  'mt-1.5 w-full rounded-xl border border-neutral-200 bg-brand-fog px-4 py-2.5 text-sm text-brand-charcoal placeholder-brand-steel transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:bg-white disabled:opacity-50';

const labelCls = 'block text-xs font-semibold text-brand-graphite uppercase tracking-wide';

interface FormData {
  name: string;
  brand: string;
  description: string;
  price: string;
  mrpPrice: string;
  moq: string;
  uom: string;
  imageUrl: string;
  status: 'active' | 'inactive' | 'discontinued';
  stockQuantity: string;
  salePrice: string;
  saleStartsAt: string; // datetime-local value, e.g. "2026-08-15T10:57"
  saleEndsAt: string;
  saleMinOrder: string; // optional min cart value (rupees) to unlock the sale price
}

/** ISO timestamp -> local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EditProductPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const router = useRouter();

  const [formData, setFormData]   = useState<FormData>({
    name: '', brand: '', description: '', price: '', mrpPrice: '',
    moq: '1', uom: '', imageUrl: '', status: 'active', stockQuantity: '0',
    salePrice: '', saleStartsAt: '', saleEndsAt: '', saleMinOrder: '',
  });
  const [categorySlug, setCategorySlug] = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [notFound, setNotFound]   = useState(false);

  // Load current product data
  useEffect(() => {
    fetch(`/admin/api/products/${encodeURIComponent(productCode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) { setNotFound(true); return; }
        const d = data.data;
        setFormData({
          name:        d.name        ?? '',
          brand:       d.brand       ?? '',
          description: d.description ?? '',
          price:       String(d.price ?? ''),
          mrpPrice:    d.mrpPrice !== '' && d.mrpPrice != null ? String(d.mrpPrice) : '',
          moq:         String(d.moq ?? 1),
          uom:         d.uom         ?? '',
          imageUrl:    d.imageUrl    ?? '',
          status:        (d.status     ?? 'active') as FormData['status'],
          stockQuantity: String(d.stockQuantity ?? 0),
          salePrice:     d.salePrice !== '' && d.salePrice != null ? String(d.salePrice) : '',
          saleStartsAt:  d.saleStartsAt ? toDatetimeLocal(d.saleStartsAt) : '',
          saleEndsAt:    d.saleEndsAt   ? toDatetimeLocal(d.saleEndsAt)   : '',
          saleMinOrder:  d.saleMinOrder !== '' && d.saleMinOrder != null ? String(d.saleMinOrder) : '',
        });
        setCategorySlug(d.categorySlug ?? '');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [productCode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) { setError('Product name is required'); return; }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) { setError('Price must be greater than 0'); return; }

    const anySale = formData.salePrice || formData.saleStartsAt || formData.saleEndsAt;
    const allSale = formData.salePrice && formData.saleStartsAt && formData.saleEndsAt;
    if (anySale && !allSale) {
      setError('To run a flash sale, fill in sale price, start time, and end time together (or clear all three to cancel it).');
      return;
    }
    if (allSale) {
      const salePriceNum = parseFloat(formData.salePrice);
      if (isNaN(salePriceNum) || salePriceNum <= 0) { setError('Sale price must be greater than 0'); return; }
      if (salePriceNum >= price) { setError('Sale price must be less than the regular selling price'); return; }
      if (new Date(formData.saleEndsAt) <= new Date(formData.saleStartsAt)) {
        setError('Sale end time must be after the start time');
        return;
      }
      if (formData.saleMinOrder) {
        const minOrderNum = parseFloat(formData.saleMinOrder);
        if (isNaN(minOrderNum) || minOrderNum <= 0) { setError('Minimum order value must be greater than 0'); return; }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:          formData.name.trim(),
        brand:         formData.brand.trim()       || null,
        description:   formData.description.trim() || null,
        price,
        mrpPrice:      formData.mrpPrice ? parseFloat(formData.mrpPrice) : null,
        moq:           parseInt(formData.moq) || 1,
        uom:           formData.uom.trim()         || null,
        imageUrl:      formData.imageUrl.trim()     || null,
        status:        formData.status,
        stockQuantity: Math.max(0, parseInt(formData.stockQuantity) || 0),
        salePrice:     formData.salePrice ? parseFloat(formData.salePrice) : null,
        saleStartsAt:  formData.saleStartsAt ? new Date(formData.saleStartsAt).toISOString() : null,
        saleEndsAt:    formData.saleEndsAt   ? new Date(formData.saleEndsAt).toISOString()   : null,
        saleMinOrder:  allSale && formData.saleMinOrder ? parseFloat(formData.saleMinOrder) : null,
      };

      const res = await fetch(`/admin/api/products/${encodeURIComponent(productCode)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');

      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl text-center space-y-4 py-20">
        <p className="text-brand-steel text-lg">Product not found.</p>
        <Link href="/admin/products" className="btn-primary inline-flex">← Back to Products</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Edit Product</h1>
          <p className="mt-0.5 text-sm text-brand-slate">
            <span className="font-mono bg-neutral-100 text-brand-graphite px-1.5 py-0.5 rounded text-xs">
              {productCode}
            </span>
            {categorySlug && (
              <span className="ml-2 text-brand-steel">· {categorySlug}</span>
            )}
          </p>
        </div>
        <Link href="/admin/products" className="text-brand-steel hover:text-brand-charcoal transition-colors text-xl leading-none">
          ✕
        </Link>
      </div>

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          <p className="font-semibold">Saved successfully!</p>
          <p>Redirecting to products list…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">

        {/* ── Product Details ─────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-brand-slate uppercase tracking-widest pb-1 border-b border-neutral-100 w-full">
            Product Details
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Product Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder='e.g. CPVC Pipe (1")' className={inputCls} disabled={saving} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange}
                placeholder="e.g. Astral" className={inputCls} disabled={saving} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange}
              rows={3} placeholder="Product features and specifications…"
              className={`${inputCls} resize-none`} disabled={saving} />
          </div>
        </fieldset>

        {/* ── Pricing ─────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-brand-slate uppercase tracking-widest pb-1 border-b border-neutral-100 w-full">
            Pricing
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" name="price" value={formData.price} onChange={handleChange}
                placeholder="0" min="0" step="0.01" className={inputCls} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>MRP Price (₹)</label>
              <input type="number" name="mrpPrice" value={formData.mrpPrice} onChange={handleChange}
                placeholder="0" min="0" step="0.01" className={inputCls} disabled={saving} />
            </div>
          </div>
        </fieldset>

        {/* ── Flash Sale ──────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-brand-slate uppercase tracking-widest pb-1 border-b border-neutral-100 w-full flex items-center justify-between gap-2">
            <span>Flash Sale</span>
            {(formData.salePrice || formData.saleStartsAt || formData.saleEndsAt) && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, salePrice: '', saleStartsAt: '', saleEndsAt: '', saleMinOrder: '' }))}
                disabled={saving}
                className="normal-case text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Clear flash sale
              </button>
            )}
          </legend>

          {formData.salePrice && formData.saleStartsAt && formData.saleEndsAt && (() => {
            const now = Date.now();
            const start = new Date(formData.saleStartsAt).getTime();
            const end = new Date(formData.saleEndsAt).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              if (now < start) {
                return (
                  <p className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    Scheduled — starts {formatDateTime(new Date(start).toISOString())}
                  </p>
                );
              }
              if (now > end) {
                return (
                  <p className="text-xs font-medium text-brand-steel bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                    Ended {formatDateTime(new Date(end).toISOString())} — save with new dates to run it again, or clear it.
                  </p>
                );
              }
              return (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  🔥 Live now — ends {formatDateTime(new Date(end).toISOString())}
                </p>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Sale Price (₹)</label>
              <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange}
                placeholder="e.g. 1" min="0" step="0.01" className={inputCls} disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sale Starts</label>
              <input type="datetime-local" name="saleStartsAt" value={formData.saleStartsAt} onChange={handleChange}
                className={inputCls} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>Sale Ends</label>
              <input type="datetime-local" name="saleEndsAt" value={formData.saleEndsAt} onChange={handleChange}
                className={inputCls} disabled={saving} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Minimum Order Value (₹)</label>
              <input type="number" name="saleMinOrder" value={formData.saleMinOrder} onChange={handleChange}
                placeholder="Optional — e.g. 100" min="0" step="0.01" className={inputCls} disabled={saving} />
              <p className="text-xs text-brand-steel mt-1">
                Leave blank for no minimum. Otherwise the sale price only applies once the shopper has this much
                (at regular prices) of OTHER products in their cart — it falls back to the regular price below that.
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-steel">
            While the sale is running, this product shows a discounted price everywhere (storefront, product page,
            checkout) and reverts automatically the moment it ends — no follow-up action needed.
          </p>
        </fieldset>

        {/* ── Catalogue Info ───────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-brand-slate uppercase tracking-widest pb-1 border-b border-neutral-100 w-full">
            Catalogue Info
          </legend>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Unit of Measure</label>
              <input type="text" name="uom" value={formData.uom} onChange={handleChange}
                placeholder="e.g. piece, bag, sqft" className={inputCls} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>Min Order Qty (MOQ)</label>
              <input type="number" name="moq" value={formData.moq} onChange={handleChange}
                min="1" step="1" className={inputCls} disabled={saving} />
            </div>
            <div>
              <label className={labelCls}>
                Stock Qty
                <span className={`ml-2 text-xs font-normal normal-case px-1.5 py-0.5 rounded-full ${
                  parseInt(formData.stockQuantity) > 10
                    ? 'bg-green-100 text-green-700'
                    : parseInt(formData.stockQuantity) > 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {parseInt(formData.stockQuantity) > 10
                    ? 'In Stock'
                    : parseInt(formData.stockQuantity) > 0
                    ? 'Low Stock'
                    : 'Out of Stock'}
                </span>
              </label>
              <input type="number" name="stockQuantity" value={formData.stockQuantity}
                onChange={handleChange} min="0" step="1" className={inputCls} disabled={saving} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Image URL</label>
            <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange}
              placeholder="https://…" className={inputCls} disabled={saving} />
          </div>
        </fieldset>

        {/* ── Status ──────────────────────────────────── */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-brand-slate uppercase tracking-widest pb-1 border-b border-neutral-100 w-full">
            Status
          </legend>
          <div className="flex gap-4 pt-1">
            {(['active', 'inactive', 'discontinued'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" name="status" value={s} checked={formData.status === s}
                  onChange={handleChange} className="accent-brand-primary" disabled={saving} />
                <span className={`text-sm font-medium capitalize ${
                  s === 'active' ? 'text-green-700' :
                  s === 'inactive' ? 'text-yellow-700' : 'text-red-700'
                }`}>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Actions ─────────────────────────────────── */}
        <div className="flex gap-3 border-t border-neutral-100 pt-5">
          <Link href="/admin/products"
            className="btn-secondary flex-1 py-2.5 justify-center text-center">
            Cancel
          </Link>
          <button type="submit" disabled={saving || success}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
