import Link from 'next/link';
import { getProductsFromCategoryTables } from '@/lib/products';
import { Plus, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Maps category_slug values (stored in category tables) to display labels.
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

export default async function ProductsPage() {
  const { products, total } = await getProductsFromCategoryTables({ limit: 500 });

  const inStock = products.filter((p) => p.stockStatus === 'in_stock').length;
  const lowOut  = products.filter((p) => p.stockStatus !== 'in_stock').length;

  // Group by category for the summary row
  const byCat: Record<string, number> = {};
  for (const p of products) {
    byCat[p.category] = (byCat[p.category] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Products</h1>
          <p className="text-brand-slate text-sm">
            {products.length} of {total} catalogue products loaded
          </p>
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
                {['Code', 'Product', 'Brand', 'Category', 'Price', 'MRP', 'MOQ', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-brand-slate uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((product) => (
                <tr key={product.productCode ?? product.id} className="hover:bg-brand-fog transition-colors">
                  {/* Product Code */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-neutral-100 text-brand-graphite px-1.5 py-0.5 rounded">
                      {product.productCode ?? product.id}
                    </span>
                  </td>

                  {/* Name + description */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-semibold text-brand-charcoal line-clamp-1">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-brand-steel line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3 text-brand-graphite whitespace-nowrap">
                    {product.brand ?? '—'}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="badge bg-primary-100 text-primary-700 whitespace-nowrap">
                      {CATEGORY_LABELS[product.category] ?? product.category}
                    </span>
                  </td>

                  {/* FastGet price */}
                  <td className="px-4 py-3 font-semibold text-brand-charcoal whitespace-nowrap">
                    ₹{product.price.toLocaleString('en-IN')}
                    <span className="text-xs text-brand-steel font-normal ml-0.5">
                      /{product.unit}
                    </span>
                  </td>

                  {/* MRP */}
                  <td className="px-4 py-3 text-brand-steel whitespace-nowrap">
                    {product.mrpPrice ? `₹${product.mrpPrice.toLocaleString('en-IN')}` : '—'}
                  </td>

                  {/* MOQ */}
                  <td className="px-4 py-3 text-brand-graphite">
                    {product.moq ?? 1}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/product/${product.productCode ?? product.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-brand-steel hover:text-brand-primary hover:bg-primary-50 inline-flex transition-all"
                      title="View in catalog"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-sm text-brand-slate">Total Products</p>
            <p className="text-2xl font-black text-brand-charcoal mt-1">{products.length}</p>
            <p className="text-xs text-brand-steel mt-0.5">{total} in DB</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-brand-slate">In Stock</p>
            <p className="text-2xl font-black text-green-600 mt-1">{inStock}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-brand-slate">Low / Out of Stock</p>
            <p className="text-2xl font-black text-red-600 mt-1">{lowOut}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-brand-slate">Categories</p>
            <p className="text-2xl font-black text-brand-charcoal mt-1">{Object.keys(byCat).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
