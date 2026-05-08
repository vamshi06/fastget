'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { products, getProductById } from '@/data/products';
import { useCart } from '@/components/CartContext';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const product = getProductById(productId);

  const { state, addItem, updateQuantity, removeItem } = useCart();

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Product Not Found
          </h1>

          <p className="text-gray-600 mb-8">
            The product you&apos;re looking for doesn&apos;t exist.
          </p>

          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:opacity-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const cartItem = state.items.find(
    (item) => item.product.id === product.id
  );

  const cartQuantity = cartItem?.quantity || 0;

  const [quantity, setQuantity] = useState(cartQuantity || 1);

  useEffect(() => {
    setQuantity(cartQuantity || 1);
  }, [cartQuantity]);

  const handleCartAction = () => {
    if (cartQuantity === 0) {
      addItem(product, quantity);
    } else {
      updateQuantity(product.id, quantity);
    }
  };

  const handleRemoveFromCart = () => {
    removeItem(product.id);
    setQuantity(1);
  };

  // Related products
  const relatedProducts = products
    .filter(
      (p) =>
        p.category === product.category &&
        p.id !== product.id
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2">
          <Link
            href="/catalog"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Catalog
          </Link>

          <span className="text-gray-400">/</span>

          <span className="text-gray-900 font-medium">
            {product.name}
          </span>
        </div>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-10 mb-16">

          {/* Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-center">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-[500px] object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <span className="text-7xl">📦</span>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-8">

            {/* Title + Price */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>

              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-black">
                  {formatCurrency(product.price)}
                </span>

                <span className="text-gray-500 mb-1">
                  per {product.unit}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Description
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Stock */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Availability
              </h3>

              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  product.stockStatus === 'in_stock'
                    ? 'bg-green-100 text-green-800'
                    : product.stockStatus === 'low'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {product.stockStatus === 'in_stock'
                  ? 'In Stock'
                  : product.stockStatus === 'low'
                  ? 'Low Stock'
                  : 'Out of Stock'}
              </div>
            </div>

            {/* Purchase Controls */}
            {product.stockStatus !== 'out' && (
              <div className="border-t border-gray-200 pt-6 space-y-5">

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Quantity
                  </label>

                  <div className="flex items-center justify-between">

                    {/* Quantity Selector */}
                    <div className="flex items-center border border-gray-300 rounded-full overflow-hidden bg-white">

                      <button
                        onClick={() =>
                          setQuantity(Math.max(1, quantity - 1))
                        }
                        className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>

                      <span className="w-14 text-center text-gray-900 font-semibold text-lg">
                        {quantity}
                      </span>

                      <button
                        onClick={() =>
                          setQuantity(quantity + 1)
                        }
                        className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Total
                      </p>

                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(product.price * quantity)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-3">

                  <button
                    onClick={handleCartAction}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" />

                    {cartQuantity === 0
                      ? `Add to Cart`
                      : `Update Cart`}
                  </button>

                  {cartQuantity > 0 && (
                    <div className="flex items-center justify-between text-sm">

                      <span className="text-gray-600">
                        In cart:{' '}
                        <span className="font-semibold text-gray-900">
                          {cartQuantity}
                        </span>
                      </span>

                      <button
                        onClick={handleRemoveFromCart}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Related Products
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((relProduct) => (
                <Link
                  key={relProduct.id}
                  href={`/product/${relProduct.id}`}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="h-44 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
                    {relProduct.imageUrl ? (
                      <img
                        src={relProduct.imageUrl}
                        alt={relProduct.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {relProduct.name}
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black">
                        {formatCurrency(relProduct.price)}
                      </span>

                      <span className="text-xs text-gray-400">
                        {relProduct.unit}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}