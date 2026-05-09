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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.name.trim()) {
        setError('Product name is required');
        setLoading(false);
        return;
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError('Price must be greater than 0');
        setLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        setError('Product description is required');
        setLoading(false);
        return;
      }

      // Create product payload
      const newProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        unit: 'pc', // Default unit
        category: formData.category,
        imageUrl: formData.imageUrl.trim() || undefined,
        stockStatus: formData.stockQuantity === '0' ? 'out' : formData.stockQuantity === 'low' ? 'low' : 'in_stock',
      };

      // Call API
      const response = await fetch('/admin/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);
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
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-1 text-sm text-gray-500">Fill in the details below to add a new product</p>
        </div>
        <Link
          href="/admin/products"
          className="text-gray-500 transition-colors hover:text-gray-700"
        >
          ✕
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="animate-fadeInUp rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">✓ Product created successfully!</p>
          <p className="text-sm">Redirecting to products list...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="animate-fadeInUp rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">✕ Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow-md">
        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Stainless Steel Pipe"
            className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the product features and specifications..."
            rows={4}
            className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none"
              disabled={loading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700">
              Stock Status <span className="text-red-500">*</span>
            </label>
            <select
              id="stockQuantity"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none"
              disabled={loading}
            >
              <option value="">Select stock status...</option>
              {STOCK_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
            Image URL
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
            className="mt-2 w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">Optional: Add a product image URL</p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Active (Show in catalog)
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/admin/products"
            className="flex-1 rounded-lg border-2 border-gray-400 px-4 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
