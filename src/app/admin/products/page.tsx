import Link from 'next/link';
import { getAllProductsFromSheets } from '@/lib/sheets';
import { Plus, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  carpentry:  'Carpentry',
  plumbing:   'Plumbing',
  hardware:   'Hardware',
  electrical: 'Electrical',
  adhesives:  'Adhesives',
};

const STOCK_BADGE: Record<string, string> = {
  in_stock: 'badge-success',
  low:      'badge-warning',
  out:      'badge-error',
};

const STOCK_LABEL: Record<string, string> = {
  in_stock: 'In Stock',
  low:      'Low Stock',
  out:      'Out of Stock',
};

export default async function ProductsPage() {
  const products = await getAllProductsFromSheets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Products</h1>
          <p className="text-brand-slate text-sm">{products.length} products in catalog</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-brand-steel font-medium mb-4">No products yet</p>
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create First Product
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-fog border-b border-gray-100">
              <tr>
                {['Product', 'Category', 'Price', 'Stock Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-brand-slate uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-brand-fog transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-brand-charcoal line-clamp-1">{product.name}</p>
                    <p className="text-xs text-brand-steel line-clamp-1 mt-0.5">{product.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-primary-100 text-primary-700">
                      {CATEGORY_LABELS[product.category] ?? product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-brand-charcoal">
                    ₹{product.price}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STOCK_BADGE[product.stockStatus] ?? 'badge bg-neutral-100 text-brand-slate'}>
                      {STOCK_LABEL[product.stockStatus] ?? product.stockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled
                      title="Edit coming soon"
                      className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-brand-slate">Total Products</p>
            <p className="text-2xl font-black text-brand-charcoal mt-1">{products.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-brand-slate">In Stock</p>
            <p className="text-2xl font-black text-green-600 mt-1">
              {products.filter((p) => p.stockStatus === 'in_stock').length}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-brand-slate">Low / Out of Stock</p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {products.filter((p) => p.stockStatus !== 'in_stock').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
