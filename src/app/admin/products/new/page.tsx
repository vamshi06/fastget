'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'carpentry', label: 'Carpentry' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'adhesives', label: 'Adhesives' },
];

const STOCK_OPTIONS = [
  { id: 'in_stock', label: 'In Stock' },
  { id: 'low', label: 'Low Stock' },
  { id: 'out', label: 'Out of Stock' },
];

const inputCls = 'mt-2 w-full rounded-xl border border-neutral-200 bg-brand-fog px-4 py-2.5 text-sm text-brand-charcoal placeholder-brand-steel transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:bg-white';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'hardware',
    stockQuantity: '',
    imageUrl: '',
    active: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) { setError('Product name is required'); setLoading(false); return; }
      if (!formData.price || parseFloat(formData.price) <= 0) { setError('Price must be greater than 0'); setLoading(false); return; }
      if (!formData.description.trim()) { setError('Product description is required'); setLoading(false); return; }

      const newProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        unit: 'pc',
        category: formData.category,
        imageUrl: formData.imageUrl.trim() || undefined,
        stockStatus: formData.stockQuantity === '0' ? 'out' : formData.stockQuantity === 'low' ? 'low' : 'in_stock',
      };

      const response = await fetch('/admin/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess(true);
      setTimeout(() => { router.push('/admin/products'); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Add New Product</h1>
          <p className="mt-1 text-sm text-brand-slate">Fill in the details below to add a new product</p>
        </div>
        <Link href="/admin/products" className="text-brand-steel hover:text-brand-charcoal transition-colors text-lg">
          ✕
        </Link>
      </div>

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          <p className="font-semibold">Product created successfully!</p>
          <p>Redirecting to products list...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
            placeholder="e.g., Stainless Steel Pipe" className={inputCls} disabled={loading} />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange}
            placeholder="Describe the product features and specifications..." rows={4}
            className={`${inputCls} resize-none`} disabled={loading} />
        </div>

        <div>
          <label htmlFor="price" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input type="number" id="price" name="price" value={formData.price} onChange={handleChange}
            placeholder="0.00" step="0.01" min="0" className={inputCls} disabled={loading} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
              Category <span className="text-red-500">*</span>
            </label>
            <select id="category" name="category" value={formData.category} onChange={handleChange}
              className={inputCls} disabled={loading}>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stockQuantity" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
              Stock Status <span className="text-red-500">*</span>
            </label>
            <select id="stockQuantity" name="stockQuantity" value={formData.stockQuantity} onChange={handleChange}
              className={inputCls} disabled={loading}>
              <option value="">Select stock status...</option>
              {STOCK_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">
            Image URL
          </label>
          <input type="url" id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange}
            placeholder="https://example.com/image.jpg" className={inputCls} disabled={loading} />
          <p className="mt-1 text-xs text-brand-steel">Optional: Add a product image URL</p>
        </div>

        <div className="flex items-center space-x-3">
          <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleChange}
            className="h-4 w-4 rounded border-neutral-200 accent-brand-primary" disabled={loading} />
          <label htmlFor="active" className="text-sm font-medium text-brand-charcoal">
            Active (Show in catalog)
          </label>
        </div>

        <div className="flex gap-3 border-t border-neutral-100 pt-5">
          <Link href="/admin/products" className="btn-secondary flex-1 py-2.5 justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
