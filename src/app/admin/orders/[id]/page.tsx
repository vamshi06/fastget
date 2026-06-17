import { getOrderById } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/types';
import { requireAdminPage } from '@/lib/auth';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireAdminPage();
  const order = await getOrderById(params.id);

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
    received: 'bg-amber-100 border-amber-300 text-amber-800',
    eta_assigned: 'bg-primary-100 border-primary-300 text-primary-700',
    out_for_delivery: 'bg-neutral-100 border-neutral-300 text-brand-graphite',
    delivered: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-500">
          <h2 className="text-3xl font-black text-brand-charcoal">Order Details</h2>
          <p className="text-brand-slate">
            Order ID: <span className="font-mono font-semibold text-brand-charcoal">{order.id}</span>
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="btn-secondary px-4 py-2 text-sm"
        >
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <div className="card p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
            <h3 className="text-lg font-bold text-brand-charcoal mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-brand-slate font-medium">Current Status</p>
                <div className={`inline-block mt-2 px-4 py-2 rounded-xl border font-bold text-sm ${statusColors[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </div>
              </div>
              <p className="text-brand-slate text-sm leading-relaxed">{ORDER_STATUS_DESCRIPTIONS[order.status]}</p>
              {order.eta && (
                <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <p className="text-primary-700 font-semibold text-sm">
                    Estimated Delivery: <span className="font-mono">{order.eta}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="card p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-150">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Customer Information</h3>
            <div className="space-y-4">
              {[
                { label: 'Name', value: order.customerName },
                { label: 'Phone', value: order.customerPhone },
              ].map(({ label, value }) => (
                <div key={label} className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                  <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">{label}</p>
                  <p className="font-semibold text-brand-charcoal mt-1">{value}</p>
                </div>
              ))}
              <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Delivery Address</p>
                <p className="font-semibold text-brand-charcoal mt-1">{order.siteAddress}</p>
                {order.landmark && (
                  <p className="text-sm text-brand-slate mt-1">Landmark: {order.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="card p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Delivery Information</h3>
            <div className="space-y-4">
              <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Delivery Type</p>
                <p className="font-semibold text-brand-charcoal mt-1 capitalize">
                  {order.deliveryType === 'urgent' ? 'Urgent' : 'Scheduled'}
                </p>
              </div>
              {order.scheduledTime && (
                <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                  <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Scheduled Time</p>
                  <p className="font-semibold text-brand-charcoal mt-1">{order.scheduledTime}</p>
                </div>
              )}
              <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Payment Method</p>
                <p className="font-semibold text-brand-charcoal mt-1 uppercase">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-250">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Order Items</h3>
            <div className="space-y-0">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between py-4 px-3 border-b border-neutral-100 last:border-0 hover:bg-primary-50 transition-colors duration-200 rounded-xl"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${250 + index * 50}ms forwards`,
                    opacity: 0,
                  }}
                >
                  <div className="flex-1">
                    <p className="font-bold text-brand-charcoal">{item.name}</p>
                    <p className="text-xs text-brand-steel font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-brand-slate font-medium">Qty: <span className="font-bold text-brand-charcoal">{item.quantity}</span></p>
                    <p className="font-bold text-brand-charcoal">₹{item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Payment & Timestamps */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-primary-50 rounded-2xl border border-primary-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-right-2 duration-500 delay-100">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-brand-slate font-medium text-sm">Subtotal</span>
                <span className="font-bold text-brand-charcoal">₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-slate font-medium text-sm">Convenience Fee</span>
                <span className="font-bold text-brand-charcoal">₹{order.convenienceFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-primary-200 pt-3 mt-3 flex justify-between items-center bg-white p-3 rounded-xl">
                <span className="font-bold text-brand-charcoal">Total</span>
                <span className="text-2xl font-black text-brand-primary">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="card p-6 animate-in fade-in slide-in-from-right-2 duration-500 delay-150">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Metadata</h3>
            <div className="space-y-4">
              <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Created</p>
                <p className="text-sm font-mono font-semibold text-brand-charcoal mt-1">{formattedDate}</p>
              </div>
              {order.statusToken && (
                <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                  <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Status Token</p>
                  <p className="text-xs font-mono text-brand-slate break-all mt-1 bg-brand-fog p-2 rounded-lg">
                    {order.statusToken}
                  </p>
                </div>
              )}
              {order.updateToken && (
                <div className="hover:bg-primary-50 p-3 rounded-xl transition-colors duration-200">
                  <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Update Token</p>
                  <p className="text-xs font-mono text-brand-slate break-all mt-1 bg-brand-fog p-2 rounded-lg">
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
