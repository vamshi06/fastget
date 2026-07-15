'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/components/UserContext';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { OrderReviewPanel } from '@/components/OrderReviewPanel';
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  MapPin,
  RefreshCw,
  ClipboardList,
  LogIn,
  UserPlus,
  Zap,
  Shield,
} from 'lucide-react';

/* ─── Status helpers ────────────────────────────────────────────────────── */

const statusColors: Record<OrderStatus, string> = {
  received:         'bg-amber-100 text-amber-800 border-amber-200',
  eta_assigned:     'bg-primary-100 text-primary-700 border-primary-200',
  out_for_delivery: 'bg-neutral-100 text-brand-graphite border-neutral-200',
  delivered:        'bg-green-100 text-green-800 border-green-200',
  cancelled:        'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  received:         Package,
  eta_assigned:     Clock,
  out_for_delivery: Truck,
  delivered:        CheckCircle,
  cancelled:        XCircle,
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatOrderTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Guest screen ──────────────────────────────────────────────────────── */

function GuestOrders() {
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Background photo */}
      <Image
        src="/construction-background.jpg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      {/* Dark gradient overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 justify-between px-6 pt-10 pb-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">My Orders</h1>
          <p className="text-sm text-white/80 mt-2 max-w-xs mx-auto leading-relaxed">
            Log in to view your order history and track every delivery in real time.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-1">
          {[
            { Icon: Truck,    text: 'Live delivery tracking for every order'     },
            { Icon: Package,  text: 'Full order history, receipts & invoices'    },
            { Icon: Zap,      text: 'Faster checkout with saved addresses'       },
            { Icon: Shield,   text: 'Secure payments & order protection'         },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3.5 border border-white/15">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-sm font-medium text-white">{text}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href={'/login?redirect=/my-orders' as any}
            className="flex items-center justify-center gap-2 w-full py-4 bg-brand-primary text-white font-bold rounded-2xl text-base shadow-brand-lg hover:bg-brand-dark transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Log In
          </Link>
          <Link
            href={'/signup?redirect=/my-orders' as any}
            className="flex items-center justify-center gap-2 w-full py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl text-base border border-white/25 hover:bg-white/20 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Authenticated orders list ─────────────────────────────────────────── */

export default function MyOrdersPage() {
  const { currentUser, isLoaded } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !currentUser) return;
    fetchOrders();
  }, [isLoaded, currentUser]);

  const fetchOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/my-orders?userId=${currentUser.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      setError('Could not load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Not loaded yet — blank while hydrating
  if (!isLoaded) return null;

  // Guest state
  if (!currentUser) return <GuestOrders />;

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-brand-charcoal">My Orders</h1>
            <p className="text-sm text-brand-slate mt-1">
              {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} placed`}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-brand-graphite hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-neutral-200 rounded w-32" />
                  <div className="h-6 bg-neutral-200 rounded-full w-28" />
                </div>
                <div className="h-3 bg-neutral-200 rounded w-48 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-64" />
                <div className="flex justify-between mt-4">
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="h-4 bg-neutral-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-lg font-bold text-brand-charcoal mb-2">No orders yet</h2>
            <p className="text-sm text-brand-slate mb-6">
              Your order history will appear here once you place an order.
            </p>
            <Link href="/catalog" className="btn-primary inline-flex px-6 py-3">
              Browse Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map(order => {
              const StatusIcon = statusIcons[order.status];
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <div>
                      <p className="text-xs text-brand-steel font-medium uppercase tracking-wide">
                        {formatOrderDate(order.createdAt)}
                        <span className="mx-1.5">·</span>
                        {formatOrderTime(order.createdAt)}
                      </p>
                      <p className="text-xs text-brand-steel mt-0.5 font-mono">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusColors[order.status]}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="px-5 py-4">
                    <div className="space-y-1.5 mb-4">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-brand-graphite">
                            {item.name}
                            <span className="text-brand-steel ml-1">× {item.quantity}</span>
                          </span>
                          <span className="text-brand-charcoal font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-brand-steel">
                          +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-neutral-100">
                      <div className="flex items-start gap-1.5 text-xs text-brand-slate max-w-[55%]">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-brand-steel" />
                        <span className="line-clamp-2">{order.siteAddress}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-brand-steel mb-0.5">Total</p>
                        <p className="text-base font-black text-brand-charcoal">{formatCurrency(order.total)}</p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/order/${order.statusToken}`}
                    className="flex items-center justify-between px-5 py-3 bg-brand-fog hover:bg-primary-50 border-t border-neutral-100 transition-colors group"
                  >
                    <span className="text-sm font-medium text-brand-primary">
                      {order.status === 'delivered' || order.status === 'cancelled'
                        ? 'View Order Details'
                        : 'Track Order'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-brand-primary group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {order.status === 'delivered' && <OrderReviewPanel orderId={order.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
