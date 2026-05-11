import { getAllOrdersFromSheets } from '@/lib/sheets';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/types';
import { cookies } from 'next/headers';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const orders = await getAllOrdersFromSheets();
  const order = orders.find((o) => o.id === params.id);
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!order) {
    notFound();
  }

  const createdDate = new Date(order.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusColors: Record<string, string> = {
    received: 'bg-blue-100 border-blue-300 text-blue-800',
    eta_assigned: 'bg-purple-100 border-purple-300 text-purple-800',
    out_for_delivery: 'bg-amber-100 border-amber-300 text-amber-800',
    delivered: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Order Details
          </h2>
          <p className="text-gray-600 text-lg">Order ID: <span className="font-mono font-semibold text-gray-900">{order.id}</span></p>
        </div>
        <Link
          href={`/admin/orders${token ? `?token=${token}` : ''}`}
          className="group px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
        >
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <div
            className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-left-2 duration-500 delay-100"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 font-medium">Current Status</p>
                <div className={`inline-block mt-2 px-4 py-2 rounded-lg border font-bold text-lg ${statusColors[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </div>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">{ORDER_STATUS_DESCRIPTIONS[order.status]}</p>
              {order.eta && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg">
                  <p className="text-blue-900 font-semibold">
                    📦 Estimated Delivery: <span className="font-mono">{order.eta}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div
            className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-left-2 duration-500 delay-150"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-5">Customer Information</h3>
            <div className="space-y-5">
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Name</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{order.customerName}</p>
              </div>
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Phone</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{order.customerPhone}</p>
              </div>
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Delivery Address</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{order.siteAddress}</p>
                {order.landmark && (
                  <p className="text-sm text-gray-600 mt-2">🏷️ Landmark: {order.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div
            className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-left-2 duration-500 delay-200"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-5">Delivery Information</h3>
            <div className="space-y-5">
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Delivery Type</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {order.deliveryType === 'urgent' ? '⚡ Urgent' : '📅 Scheduled'}
                </p>
              </div>
              {order.scheduledTime && (
                <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                  <p className="text-sm text-gray-600 font-medium">Scheduled Time</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{order.scheduledTime}</p>
                </div>
              )}
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Payment Method</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 uppercase">💰 {order.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div
            className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-left-2 duration-500 delay-250"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-5">Order Items</h3>
            <div className="space-y-0">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between py-4 px-3 border-b border-gray-200 last:border-0 hover:bg-blue-50 transition-colors duration-200 rounded-lg"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${250 + index * 50}ms forwards`,
                    opacity: 0,
                  }}
                >
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{item.name}</p>
                    <p className="text-sm text-gray-600 font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">Qty: <span className="font-bold">{item.quantity}</span></p>
                    <p className="font-bold text-gray-900 text-lg">₹{item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Payment & Timestamps */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-300 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-right-2 duration-500 delay-100"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-5">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900">₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Convenience Fee</span>
                <span className="font-bold text-gray-900">₹{order.convenienceFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-300 pt-3 mt-3 flex justify-between items-center bg-white p-3 rounded-lg">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="text-2xl font-bold text-blue-600">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div
            className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-right-2 duration-500 delay-150"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-5">Metadata</h3>
            <div className="space-y-4">
              <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                <p className="text-sm text-gray-600 font-medium">Created</p>
                <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{formattedDate}</p>
              </div>
              {order.statusToken && (
                <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                  <p className="text-sm text-gray-600 font-medium">Status Token</p>
                  <p className="text-xs font-mono text-gray-600 break-all mt-1 bg-gray-50 p-2 rounded">
                    {order.statusToken}
                  </p>
                </div>
              )}
              {order.updateToken && (
                <div className="hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                  <p className="text-sm text-gray-600 font-medium">Update Token</p>
                  <p className="text-xs font-mono text-gray-600 break-all mt-1 bg-gray-50 p-2 rounded">
                    {order.updateToken}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
