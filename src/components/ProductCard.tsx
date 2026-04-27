'use client';

import { Product } from '@/types';
import { useCart } from './CartContext';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { state, addItem, updateQuantity, removeItem } = useCart();
  
  const cartItem = state.items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleIncrement = () => {
    if (quantity === 0) {
      addItem(product, 1);
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else {
      removeItem(product.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <span className="text-4xl">📦</span>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-3">{product.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-blue-600">
            {formatCurrency(product.price)}
          </span>
          <span className="text-xs text-gray-400">per {product.unit}</span>
        </div>

        {product.stockStatus === 'out' ? (
          <button
            disabled
            className="w-full py-2 px-4 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
          >
            Out of Stock
          </button>
        ) : quantity === 0 ? (
          <button
            onClick={handleIncrement}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleDecrement}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
