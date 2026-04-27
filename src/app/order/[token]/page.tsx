'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  MapPin, 
  Phone, 
  User,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

const statusIcons: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  received: Package,
  eta_assigned: Clock,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const statusColors: Record<OrderStatus, string> = {
  received: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  eta_assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export default function OrderStatusPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch order');
        }

        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchOrder();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-8">{error || 'We could not find an order with this token.'}</p>
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(-8).toUpperCase()}</h1>
              <p className="text-gray-500 mt-1">
                Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${statusColors[order.status]}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-semibold">{ORDER_STATUS_LABELS[order.status]}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">{ORDER_STATUS_DESCRIPTIONS[order.status]}</p>
            {order.eta && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <p className="mt-2 text-blue-700 font-medium">
                Estimated delivery: {order.eta}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h2>
          <div className="relative">
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded"></div>
            <div className="relative flex justify-between">
              {(['received', 'eta_assigned', 'out_for_delivery', 'delivered'] as OrderStatus[]).map((status, index) => {
                const isCompleted = ['delivered', 'out_for_delivery', 'eta_assigned', 'received'].indexOf(order.status) <= index;
                const isCurrent = order.status === status;
                
                return (
                  <div key={status} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Delivery Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Delivery Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-gray-600">{order.customerPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">{order.siteAddress}</p>
                  {order.landmark && (
                    <p className="text-gray-500 text-sm">Landmark: {order.landmark}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">
                    {order.deliveryType === 'urgent' ? 'Urgent Delivery' : 'Scheduled Delivery'}
                  </p>
                  {order.scheduledTime && (
                    <p className="text-gray-500 text-sm">{formatDate(order.scheduledTime)} at {formatTime(order.scheduledTime)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Payment Method</span>
                <span className="font-medium text-gray-900">Cash on Delivery</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Convenience Fee</span>
                <span>{formatCurrency(order.convenienceFee)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
                <span>Total Amount</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📦</span>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">× {item.quantity}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">Need help with your order?</p>
          <a
            href="tel:+919999999999"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Phone className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
