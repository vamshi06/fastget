'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ImageUrlPreview } from '@/components/ImageUrlPreview';

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
  return (
    <Suspense>
      <NewProductForm />
    </Suspense>
  );
}

function NewProductForm() {
  const router = useRouter();
  // "Add another size" from a product's edit page: prefill from that product
  // and link the new one into its size family on save.
  const familyOf = useSearchParams().get('familyOf') || '';
  const [familyOfName, setFamilyOfName] = useState('');
  const [optionLabel, setOptionLabel] = useState('');
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
    size:          '',
    colour:        '',
    remarks:       '',
    salePrice:     '',
    saleStartsAt:  '', // datetime-local value
    saleEndsAt:    '',
    saleMinOrder:  '',
    nameHi:        '',
    descriptionHi: '',
  });
  const [warning, setWarning] = useState('');

  // Load categories from DB on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.categories?.length) {
          setCategories(data.data.categories);
          // Keep a category prefilled from the size family, if it arrived first.
          setFormData((prev) => ({ ...prev, categorySlug: prev.categorySlug || data.data.categories[0].slug }));
        }
      })
      .catch(() => {/* categories stay empty, dropdown shows fallback */});
  }, []);

  // Prefill shared details from the product this is another size of.
  useEffect(() => {
    if (!familyOf) return;
    fetch(`/admin/api/products/${encodeURIComponent(familyOf)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const d = data.data;
        setFamilyOfName(d.name ?? familyOf);
        setFormData((prev) => ({
          ...prev,
          name:         d.name        ?? prev.name,
          brand:        d.brand       ?? prev.brand,
          description:  d.description ?? prev.description,
          uom:          d.uom         ?? prev.uom,
          imageUrl:     d.imageUrl    ?? prev.imageUrl,
          moq:          String(d.moq ?? prev.moq),
          colour:       d.colour      ?? prev.colour,
          categorySlug: d.currentCategory || prev.categorySlug,
        }));
      })
      .catch(() => {});
  }, [familyOf]);

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
    const fail = (msg: string) => { setError(msg); setLoading(false); };
    if (formData.mrpPrice) {
      const mrp = parseFloat(formData.mrpPrice);
      if (isNaN(mrp) || mrp < price) return fail('MRP must be greater than or equal to the selling price');
    }
    const anySale = formData.salePrice || formData.saleStartsAt || formData.saleEndsAt;
    const allSale = formData.salePrice && formData.saleStartsAt && formData.saleEndsAt;
    if (anySale && !allSale) {
      return fail('To run a flash sale, fill in sale price, start time, and end time together (or leave all three blank).');
    }
    if (allSale) {
      const salePriceNum = parseFloat(formData.salePrice);
      if (isNaN(salePriceNum) || salePriceNum <= 0) return fail('Sale price must be greater than 0');
      if (salePriceNum >= price) return fail('Sale price must be less than the regular selling price');
      if (new Date(formData.saleEndsAt) <= new Date(formData.saleStartsAt)) {
        return fail('Sale end time must be after the start time');
      }
      if (formData.saleMinOrder) {
        const minOrderNum = parseFloat(formData.saleMinOrder);
        if (isNaN(minOrderNum) || minOrderNum <= 0) return fail('Minimum order value must be greater than 0');
      }
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
        size:          formData.size.trim()        || undefined,
        colour:        formData.colour.trim()      || undefined,
        remarks:       formData.remarks.trim()     || undefined,
        salePrice:     allSale ? parseFloat(formData.salePrice) : undefined,
        saleStartsAt:  allSale ? new Date(formData.saleStartsAt).toISOString() : undefined,
        saleEndsAt:    allSale ? new Date(formData.saleEndsAt).toISOString()   : undefined,
        saleMinOrder:  allSale && formData.saleMinOrder ? parseFloat(formData.saleMinOrder) : undefined,
        nameHi:        formData.nameHi.trim()        || undefined,
        descriptionHi: formData.descriptionHi.trim() || undefined,
        familyOf:      familyOf || undefined,
        optionLabel:   familyOf ? optionLabel.trim() || formData.size.trim() || undefined : undefined,
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
      // A new size goes back to the family it joined.
      const next = familyOf ? `/admin/products/${encodeURIComponent(familyOf)}/edit#sizes` : '/admin/products';
      if (data.warning) {
        // Leave the message up instead of redirecting straight away
        setWarning(data.warning);
        setTimeout(() => router.push(next as any), 5000);
      } else {
        setTimeout(() => router.push(next as any), 1500);
      }
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
          <h1 className="text-2xl font-black text-brand-charcoal">{familyOf ? 'Add Another Size' : 'Add New Product'}</h1>
          <p className="mt-1 text-sm text-brand-slate">
            {familyOf
              ? <>New size of <span className="font-semibold">{familyOfName || familyOf}</span>. Details are copied - change the size, price, MRP and stock.</>
              : 'Fill in the details to add a product to the database'}
          </p>
        </div>
        <Link href="/admin/products" className="text-brand-steel hover:text-brand-charcoal transition-colors text-lg">
          ✕
        </Link>
      </div>

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          <p className="font-semibold">Product created successfully!</p>
          <p>Redirecting to products list…</p>
          {warning && <p className="mt-2 font-semibold text-yellow-800">{warning}</p>}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <label htmlFor="name" className={labelCls}>
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange}
                placeholder="e.g., Teak Wood Plank"
                className={inputCls} disabled={loading} required
              />
              {familyOf && (
                <p className="mt-1 text-xs text-yellow-700">
                  Update the size in brackets, e.g. Telescopic Channel (24&quot;).
                </p>
              )}
            </div>

            <div className="sm:col-span-1">
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

        {/* ── Hindi ───────────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Hindi (हिंदी)
          </h2>
          <div>
            <label htmlFor="nameHi" className={labelCls}>Hindi Name</label>
            <input
              type="text" id="nameHi" name="nameHi" lang="hi"
              value={formData.nameHi} onChange={handleChange}
              placeholder="e.g. सागौन लकड़ी का तख्ता"
              className={inputCls} disabled={loading}
            />
            <p className="mt-1 text-xs text-brand-steel">
              Optional - shown when the site is in Hindi. Keep brand names, sizes and model numbers as they are.
              Leave blank to show the English name.
            </p>
          </div>
          <div>
            <label htmlFor="descriptionHi" className={labelCls}>Hindi Description</label>
            <textarea
              id="descriptionHi" name="descriptionHi" lang="hi"
              value={formData.descriptionHi} onChange={handleChange}
              rows={3} className={`${inputCls} resize-none`} disabled={loading || !formData.nameHi.trim()}
            />
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Pricing
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <p className="mt-1 text-xs text-brand-steel">Optional - shown as strikethrough price</p>
            </div>
          </div>
        </section>

        {/* ── Flash Sale ──────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Flash Sale <span className="normal-case font-normal text-brand-steel">(optional)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salePrice" className={labelCls}>Sale Price (₹)</label>
              <input
                type="number" id="salePrice" name="salePrice"
                value={formData.salePrice} onChange={handleChange}
                placeholder="e.g. 99" step="0.01" min="0"
                className={inputCls} disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="saleMinOrder" className={labelCls}>Minimum Order Value (₹)</label>
              <input
                type="number" id="saleMinOrder" name="saleMinOrder"
                value={formData.saleMinOrder} onChange={handleChange}
                placeholder="Optional" step="0.01" min="0"
                className={inputCls} disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="saleStartsAt" className={labelCls}>Sale Starts</label>
              <input
                type="datetime-local" id="saleStartsAt" name="saleStartsAt"
                value={formData.saleStartsAt} onChange={handleChange}
                className={inputCls} disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="saleEndsAt" className={labelCls}>Sale Ends</label>
              <input
                type="datetime-local" id="saleEndsAt" name="saleEndsAt"
                value={formData.saleEndsAt} onChange={handleChange}
                className={inputCls} disabled={loading}
              />
            </div>
          </div>
          <p className="text-xs text-brand-steel">
            Fill in sale price, start and end together, or leave all three blank for no sale.
            The minimum order value is the amount of OTHER products (at regular prices) the cart must hold
            before the sale price applies.
          </p>
        </section>

        {/* ── Classification ──────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Classification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {/* A unit copied from the family that isn't in the usual list */}
                {formData.uom && !UOM_OPTIONS.includes(formData.uom) && (
                  <option value={formData.uom}>{formData.uom}</option>
                )}
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

        {/* ── Specifications ──────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Specifications
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="size" className={labelCls}>Size</label>
              <input
                type="text" id="size" name="size"
                value={formData.size} onChange={handleChange}
                placeholder="e.g. 1 Kg, 18mm, 8x4 ft"
                className={inputCls} disabled={loading}
              />
            </div>
            {familyOf && (
              <div className="sm:col-span-2">
                <label htmlFor="optionLabel" className={labelCls}>Size label customers see</label>
                <input
                  type="text" id="optionLabel"
                  value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)}
                  placeholder={formData.size || 'e.g. 24", 4 Litre'}
                  maxLength={100}
                  className={inputCls} disabled={loading}
                />
                <p className="mt-1 text-xs text-brand-steel">
                  The button on the product page and in the size list. Leave blank to use the Size above.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="colour" className={labelCls}>Colour / Finish</label>
              <input
                type="text" id="colour" name="colour"
                value={formData.colour} onChange={handleChange}
                placeholder="e.g. White, Natural"
                className={inputCls} disabled={loading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="remarks" className={labelCls}>Remarks</label>
            <input
              type="text" id="remarks" name="remarks"
              value={formData.remarks} onChange={handleChange}
              placeholder="Optional"
              className={inputCls} disabled={loading}
            />
          </div>
          <p className="text-xs text-brand-steel">
            Shown in the Specifications box on the product page, together with Unit of Measure.
          </p>
        </section>

        {/* ── Inventory ───────────────────────────────────────────── */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-graphite uppercase tracking-wide border-b border-neutral-100 pb-2">
            Inventory
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label htmlFor="stockQuantity" className={labelCls}>Stock Qty (manual)</label>
              <input
                type="number" id="stockQuantity" name="stockQuantity"
                value={formData.stockQuantity} onChange={handleChange}
                min="0" step="1"
                className={inputCls} disabled={loading}
              />
              <p className="text-xs text-brand-steel mt-1">
                Orders don&apos;t reduce this automatically - keep it updated by hand.
              </p>
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
            <ImageUrlPreview url={formData.imageUrl} />
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
            type="submit" disabled={loading || success || categories.length === 0}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
