'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { AlertCircle, RefreshCw, ChevronRight, Phone, MapPin, Clock } from 'lucide-react';

const STATUSES = ['received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled'];

export default function AgentDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('received');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchOrders = useCallback(async (status: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/pending?status=${status}&limit=50`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
      setOrders(data.orders || []);
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
    fetchOrders(selectedStatus);
    fetchStatusCounts();
  }, [selectedStatus, fetchOrders, fetchStatusCounts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(selectedStatus);
    await fetchStatusCounts();
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

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-black text-brand-charcoal">Agent Dashboard</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <p className="text-brand-slate">Manage orders and update status</p>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => { setSelectedStatus(status); setLoading(true); }}
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
          </div>
        )}
      </div>
    </div>
  );
}
