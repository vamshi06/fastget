'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Order, OrderStatus, PaymentMethod, ORDER_STATUS_LABELS } from '@/types';
import type { AdminOrderFilters } from '@/lib/db';
import { adminOrderFiltersToQuery } from '@/lib/admin-order-filters';
import { formatOrderNumber, orderCoinDiscount } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface OrdersListProps {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  filters: AdminOrderFilters;
}

const inputCls = 'w-full px-4 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-brand-charcoal font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-all duration-200';

// Filtering and paging run on the server; this component only edits the URL.
// Keeping filters in the URL means "View order → Back" returns to the same
// filtered list, and the Export link always matches what's on screen.
export function OrdersListClient({ orders, total, page, pageSize, filters }: OrdersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState(filters.q ?? '');
  const firstRender = useRef(true);

  const navigate = (next: AdminOrderFilters, nextPage = 1) => {
    const query = adminOrderFiltersToQuery({ ...next, page: nextPage });
    startTransition(() => {
      router.replace(`/admin/orders${query ? `?${query}` : ''}` as any, { scroll: false });
    });
  };

  const setFilter = <K extends keyof AdminOrderFilters>(key: K, value: AdminOrderFilters[K] | '') => {
    navigate({ ...filters, [key]: value || undefined });
  };

  // Debounce the free-text search so the list doesn't reload on every keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if ((filters.q ?? '') !== searchText.trim()) setFilter('q', searchText.trim());
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const handleReset = () => {
    setSearchText('');
    navigate({});
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const exportQuery = adminOrderFiltersToQuery(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="card p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-bold text-brand-charcoal">Filters</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              value={filters.status ?? 'all'}
              onChange={(e) => setFilter('status', e.target.value === 'all' ? '' : (e.target.value as OrderStatus))}
              className={inputCls}
            >
              <option value="all">All</option>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Payment Method
            </label>
            <select
              value={filters.payment ?? 'all'}
              onChange={(e) => setFilter('payment', e.target.value === 'all' ? '' : (e.target.value as PaymentMethod))}
              className={inputCls}
            >
              <option value="all">All</option>
              <option value="cod">Cash on Delivery</option>
              <option value="razorpay">Paid Online</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Search
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Name, phone, order no."
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleReset}
            disabled={!hasFilters && !searchText}
            className="text-brand-primary hover:text-brand-dark font-semibold text-sm transition-colors duration-200 disabled:opacity-40"
          >
            ↺ Reset Filters
          </button>
          <p className="text-xs text-brand-steel">Dates are in India time (IST).</p>
        </div>
      </div>

      {/* Results Table */}
      <div className={`card overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        <div className="px-4 sm:px-6 py-5 bg-gradient-to-r from-primary-50 to-white border-b border-neutral-100 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-brand-charcoal">
            Orders <span className="text-brand-primary">({total.toLocaleString('en-IN')})</span>
          </h3>
          {/* Plain <a download> - a <Link> would try to prefetch/client-route the CSV. */}
          <a
            href={`/admin/api/orders/export${exportQuery ? `?${exportQuery}` : ''}`}
            download
            className="btn-primary text-sm py-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>

        {/* Phones: one card per order - the 7-column table only fits from md up */}
        <div className="md:hidden divide-y divide-neutral-100">
          {orders.length > 0 ? (
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block px-4 py-3.5 active:bg-primary-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-brand-charcoal">{formatOrderNumber(order)}</p>
                    <p className="text-sm font-medium text-brand-charcoal truncate">{order.customerName}</p>
                    <p className="text-xs text-brand-steel">
                      {order.customerPhone} · {formatAdminOrderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <OrderAmount order={order} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <PaymentBadge order={order} />
                  <StatusBadge status={order.status} />
                  <ChevronRight className="w-4 h-4 text-brand-steel ml-auto" />
                </div>
              </Link>
            ))
          ) : (
            <p className="px-4 py-12 text-center text-brand-slate font-medium">No orders found</p>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-brand-fog border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-neutral-100 hover:bg-primary-50 transition-colors duration-200 group"
                  >
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-brand-charcoal group-hover:text-brand-primary transition-colors" title={order.id}>
                      {formatOrderNumber(order)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-brand-charcoal">{order.customerName}</div>
                      <div className="text-xs text-brand-steel">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-slate whitespace-nowrap">
                      {formatAdminOrderDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderAmount order={order} />
                    </td>
                    <td className="px-6 py-4">
                      <PaymentBadge order={order} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-brand-primary hover:text-brand-dark font-semibold text-sm transition-colors duration-200 whitespace-nowrap"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-brand-slate font-medium">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-neutral-100 bg-brand-fog">
            <button
              onClick={() => navigate(filters, page - 1)}
              disabled={page <= 1 || isPending}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-neutral-200 hover:border-brand-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <p className="text-sm text-brand-slate">
              Page {page} of {totalPages}
            </p>
            <button
              onClick={() => navigate(filters, page + 1)}
              disabled={page >= totalPages || isPending}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-neutral-200 hover:border-brand-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatAdminOrderDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

/** Amount due, plus any part paid with coins (else a coin-paid order shows a bare ₹0). */
function OrderAmount({ order }: { order: Order }) {
  const coins = orderCoinDiscount(order);
  return (
    <>
      <p className="text-sm font-bold text-brand-charcoal">₹{order.total.toLocaleString('en-IN')}</p>
      {coins > 0 && (
        <p className="text-[11px] font-medium text-brand-dark">+ ₹{coins.toLocaleString('en-IN')} coins</p>
      )}
    </>
  );
}

function PaymentBadge({ order }: { order: Order }) {
  if (order.paymentMethod === 'cod') {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        COD
      </span>
    );
  }

  // Razorpay orders are only ever persisted once payment is captured (see
  // /api/payment/verify-payment) - payment_status momentarily null right
  // after that write is the only case that isn't "Paid", so it's labelled
  // Pending rather than assumed captured.
  const captured = order.paymentStatus === 'captured';
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
        captured ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'
      }`}
    >
      {captured ? 'Paid' : 'Payment Pending'}
    </span>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const statusColors: Record<OrderStatus, string> = {
    received: 'bg-amber-100 text-amber-800 border border-amber-300',
    eta_assigned: 'bg-primary-100 text-primary-700 border border-primary-200',
    out_for_delivery: 'bg-neutral-100 text-brand-graphite border border-neutral-200',
    delivered: 'bg-green-100 text-green-800 border border-green-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
