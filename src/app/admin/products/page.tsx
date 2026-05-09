import Link from 'next/link';
import { getAllProductsFromSheets } from '@/lib/sheets';
import { Product } from '@/types';

export default async function ProductsPage() {
  const products = await getAllProductsFromSheets();

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      carpentry: 'Carpentry',
      plumbing: 'Plumbing',
      hardware: 'Hardware',
      electrical: 'Electrical',
      adhesives: 'Adhesives',
    };
    return labels[category] || category;
  };

  const getStockLabel = (status: string): string => {
    const labels: Record<string, string> = {
      in_stock: 'In Stock',
      low: 'Low Stock',
      out: 'Out of Stock',
    };
    return labels[status] || status;
  };

  const getStockColor = (status: string): string => {
    switch (status) {
      case 'in_stock':
        return 'text-green-600';
      case 'low':
        return 'text-yellow-600';
      case 'out':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Product
        </Link>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        {products.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4m0 0L4 7m16 0v10l-8 4m0 0l-8-4m0 0v-10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
            <p className="mt-1 text-sm text-gray-500">Start by creating your first product.</p>
            <div className="mt-6">
              <Link
                href="/admin/products/new"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700"
              >
                Create First Product
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Stock Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr
                    key={product.id}
                    className="animate-fadeInUp transition-colors hover:bg-gray-50"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationDuration: '0.6s',
                      animationFillMode: 'both',
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">₹{product.price}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${getStockColor(product.stockStatus)}`}>
                        {getStockLabel(product.stockStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.id.includes('2024') ? product.id : new Date().toISOString())
                        .toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        disabled
                        className="text-blue-600 opacity-50 cursor-not-allowed hover:text-blue-900"
                        title="Edit functionality coming soon"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white px-4 py-5 shadow-md sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Total Products</dt>
            <dd className="mt-1 text-3xl font-bold text-gray-900">{products.length}</dd>
          </div>
          <div className="rounded-lg bg-white px-4 py-5 shadow-md sm:px-6">
            <dt className="text-sm font-medium text-gray-500">In Stock</dt>
            <dd className="mt-1 text-3xl font-bold text-green-600">
              {products.filter((p) => p.stockStatus === 'in_stock').length}
            </dd>
          </div>
          <div className="rounded-lg bg-white px-4 py-5 shadow-md sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Low/Out of Stock</dt>
            <dd className="mt-1 text-3xl font-bold text-red-600">
              {products.filter((p) => p.stockStatus !== 'in_stock').length}
            </dd>
          </div>
        </div>
      )}
    </div>
  );
}
