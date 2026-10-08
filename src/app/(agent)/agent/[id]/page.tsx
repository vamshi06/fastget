'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { OrderStatusUpdater } from '@/components/OrderStatusUpdater';
import { stockProblemLabel, type StockProblem } from '@/lib/order-stock';
import {
  AlertCircle,
  PackageX,
  ChevronLeft,
  ExternalLink,
  Loader,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function AgentUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [stockProblems, setStockProblems] = useState<Record<string, StockProblem>>({});
  const [loadingOrder, setLoadingOrder] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/by-id/${orderId}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Order not found');
        const data = await response.json();
        setOrder(data.order);
        setStockProblems(data.stockProblems ?? {});
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleUpdated = (newStatus: OrderStatus, eta?: string) => {
    setOrder((prev) => (prev ? { ...prev, status: newStatus, eta: eta || prev.eta } : prev));
    setTimeout(() => { router.push('/agent-dashboard'); }, 1500);
  };

  const statusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, string> = {
      received: 'bg-amber-100 text-amber-800',
      eta_assigned: 'bg-primary-100 text-primary-700',
      out_for_delivery: 'bg-neutral-100 text-brand-graphite',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-neutral-100 text-brand-slate';
  };

  if (loadingOrder) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-brand-primary mx-auto mb-4" />
            <p className="text-brand-slate">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal mb-4 text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
          <h2 className="text-lg font-bold text-red-900">Order Not Found</h2>
          <p className="text-red-800 mt-1 text-sm">The order could not be found. Please try again.</p>
        </div>
      </div>
    );
  }

  const paidOnline = order.paymentMethod === 'razorpay' && order.paymentStatus === 'captured';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-brand-primary hover:text-brand-dark text-sm font-semibold transition-colors"
        >
          Full order details <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid gap-6">
          {/* Order Summary Card */}
          <div className="card p-6">
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-xl font-black text-brand-charcoal">{order.customerName}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="space-y-2 text-brand-charcoal text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-steel" />
                  <a href={`tel:${order.customerPhone}`} className="hover:text-brand-primary">{order.customerPhone}</a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-steel mt-0.5" />
                  <div>
                    <div>{order.siteAddress}</div>
                    {order.landmark && <div className="text-xs text-brand-slate">Landmark: {order.landmark}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-t border-neutral-100">
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Order Date</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">{formatDate(order.createdAt)}</p>
                <p className="text-xs text-brand-slate">{formatTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Amount</p>
                <p className="text-lg font-black text-brand-primary mt-1">{formatCurrency(order.total)}</p>
                <p className="text-xs text-brand-slate">{order.paymentMethod === 'cod' ? 'Collect cash' : paidOnline ? 'Paid online' : 'Payment pending'}</p>
              </div>
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Items</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">{order.items.length}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs font-semibold text-brand-graphite uppercase tracking-wide mb-2">Order Items</p>
              {Object.keys(stockProblems).length > 0 && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-900">
                  <PackageX className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Some items don&apos;t have enough stock - check before confirming or dispatching.</span>
                </div>
              )}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-3 text-sm text-brand-charcoal">
                    <span>
                      {item.quantity}× {item.name}
                      {stockProblems[item.sku] && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {stockProblemLabel(stockProblems[item.sku])}
                        </span>
                      )}
                    </span>
                    <span className="text-brand-slate whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.eta && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span className="text-brand-slate">ETA: <strong className="text-brand-charcoal">{order.eta}</strong></span>
                </div>
              </div>
            )}
          </div>

          <OrderStatusUpdater
            orderId={order.id}
            status={order.status}
            customerName={order.customerName}
            paidOnlineAmount={paidOnline ? order.total : undefined}
            onUpdated={handleUpdated}
          />
        </div>
      </div>
  );
}
