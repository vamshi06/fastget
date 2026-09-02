'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils';
import {
  AlertCircle, RefreshCw, ChevronRight, ChevronLeft, Phone, MapPin, Clock, ArrowUp, ArrowDown,
} from 'lucide-react';

const STATUSES = ['received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled'];
const PAGE_SIZE = 20;

// ── Pagination range helper (same shape as the catalog page) ──────────────────
function paginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const left  = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  const range: (number | '...')[] = [1];

  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  range.push(total);

  return range;
}

export default function AgentDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('received');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchOrders = useCallback(async (status: string, page: number, sort: 'asc' | 'desc') => {
    try {
      setError(null);
      const offset = (page - 1) * PAGE_SIZE;
      const response = await fetch(
        `/api/orders/pending?status=${status}&limit=${PAGE_SIZE}&offset=${offset}&sort=${sort}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
      setOrders(data.orders || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};
      for (const status of STATUSES) {
        const response = await fetch(`/api/orders/pending?status=${status}&limit=1`);
        if (!response.ok) { counts[status] = 0; continue; }
        const data = await response.json();
        counts[status] = data.count || 0;
      }
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to fetch status counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders(selectedStatus, currentPage, sortOrder);
    fetchStatusCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, currentPage, sortOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(selectedStatus, currentPage, sortOrder);
    await fetchStatusCounts();
  };

  const handleSelectStatus = (status: string) => {
    if (status === selectedStatus) return;
    setSelectedStatus(status);
    setCurrentPage(1);
    setLoading(true);
  };

  const handleToggleSort = () => {
    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
    setLoading(true);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setLoading(true);
  };

  const statusLabels: Record<string, string> = {
    received: 'Order Received',
    eta_assigned: 'ETA Assigned',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const statusCardColors: Record<string, string> = {
    received: 'bg-amber-50 border-amber-200',
    eta_assigned: 'bg-primary-50 border-primary-200',
    out_for_delivery: 'bg-neutral-50 border-neutral-200',
    delivered: 'bg-green-50 border-green-200',
    cancelled: 'bg-red-50 border-red-200',
  };

  const statusBadges: Record<string, string> = {
    received: 'bg-amber-100 text-amber-800',
    eta_assigned: 'bg-primary-100 text-primary-700',
    out_for_delivery: 'bg-neutral-100 text-brand-graphite',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const pages = paginationRange(currentPage, totalPages);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal">Agent Dashboard</h1>
          <p className="text-brand-slate text-sm mt-1">Manage orders and update status</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div>
        {/* Status Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleSelectStatus(status)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === status
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white text-brand-charcoal border border-neutral-200 hover:border-brand-primary hover:bg-primary-50'
                }`}
              >
                {statusLabels[status]}
                <span className="ml-2 text-xs font-semibold opacity-75">
                  ({statusCounts[status] || 0})
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleToggleSort}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white text-brand-charcoal border border-neutral-200 hover:border-brand-primary hover:bg-primary-50 transition-all"
          >
            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-brand-slate">Loading orders...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Orders</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-brand-slate text-lg">No orders with status &quot;{statusLabels[selectedStatus]}&quot;</p>
            <p className="text-brand-steel mt-2 text-sm">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/agent/${order.id}`} className="block">
                <div className={`border rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer ${statusCardColors[order.status]}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-lg font-bold text-brand-charcoal">{order.customerName}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadges[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-brand-charcoal text-sm">
                            <Phone className="w-4 h-4 text-brand-steel" />
                            <span>{order.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-brand-charcoal text-sm">
                            <MapPin className="w-4 h-4 text-brand-steel" />
                            <span className="line-clamp-1">{order.siteAddress}</span>
                          </div>
                          {order.landmark && (
                            <div className="text-xs text-brand-slate ml-6">
                              Landmark: {order.landmark}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-brand-slate text-sm">
                            <Clock className="w-4 h-4 text-brand-steel" />
                            <span>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</span>
                          </div>
                          <div className="text-lg font-black text-brand-primary">
                            {formatCurrency(order.total)}
                          </div>
                          {order.eta && (
                            <div className="text-xs text-brand-slate">ETA: {order.eta}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-brand-slate">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        {' '}({order.items.map(item => `${item.quantity}×${item.name}`).join(', ')})
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="btn-primary">
                        <span>Manage</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center justify-center w-full gap-2">
                  {/* Previous */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={cn(
                      'flex items-center gap-1.5 h-10 px-2.5 sm:px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                      currentPage === 1
                        ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                        : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto hide-scrollbar min-w-0">
                    {pages.map((p, idx) =>
                      p === '...' ? (
                        <span
                          key={`dots-${idx}`}
                          className="w-9 h-10 flex items-center justify-center text-brand-steel text-[14px] shrink-0"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          className={cn(
                            'w-10 h-10 rounded-xl text-[14px] font-medium transition-all shrink-0',
                            p === currentPage
                              ? 'bg-brand-primary text-white shadow-md'
                              : 'bg-white border border-neutral-200 text-brand-charcoal hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                          )}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'flex items-center gap-1.5 h-10 px-2.5 sm:px-4 rounded-xl text-[14px] font-medium transition-all shrink-0',
                      currentPage === totalPages
                        ? 'text-brand-steel bg-white border border-neutral-100 cursor-not-allowed opacity-50'
                        : 'text-brand-charcoal bg-white border border-neutral-200 hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50',
                    )}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Page info */}
                <p className="text-[13px] text-brand-steel">
                  Page {currentPage} of {totalPages}
                  {totalCount > 0 && ` · ${totalCount} order${totalCount !== 1 ? 's' : ''} total`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
