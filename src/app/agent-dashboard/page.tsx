'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { AlertCircle, RefreshCw, ChevronRight, Phone, User, MapPin, Clock } from 'lucide-react';

export default function AgentDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('received');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const statuses = ['received', 'eta_assigned', 'out_for_delivery', 'delivered', 'cancelled'];

  const fetchOrders = useCallback(async (status: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/pending?status=${status}&limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

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
      for (const status of statuses) {
        const response = await fetch(`/api/orders/pending?status=${status}&limit=1`);
        if (!response.ok) {
          console.error(`Failed to fetch count for status ${status}`);
          counts[status] = 0;
          continue;
        }
        const data = await response.json();
        counts[status] = data.count || 0;
      }
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to fetch status counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  useEffect(() => {
    fetchOrders(selectedStatus);
  }, [selectedStatus, fetchOrders]);

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

  const statusColors: Record<string, string> = {
    received: 'bg-yellow-50 border-yellow-200',
    eta_assigned: 'bg-blue-50 border-blue-200',
    out_for_delivery: 'bg-purple-50 border-purple-200',
    delivered: 'bg-green-50 border-green-200',
    cancelled: 'bg-red-50 border-red-200',
  };

  const statusBadges: Record<string, string> = {
    received: 'bg-yellow-100 text-yellow-800',
    eta_assigned: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <p className="text-gray-600">Manage orders and update status</p>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status);
                setLoading(true);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {statusLabels[status]}
              <span className="ml-2 text-xs font-semibold">
                ({statusCounts[status] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Orders</h3>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-600 text-lg">No orders with status &quot;{statusLabels[selectedStatus]}&quot;</p>
            <p className="text-gray-500 mt-2">All caught up! ✨</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/agent/${order.updateToken}`}>
                <div
                  className={`border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${statusColors[order.status]}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {order.customerName}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadges[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {/* Customer Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{order.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="line-clamp-1">{order.siteAddress}</span>
                          </div>
                          {order.landmark && (
                            <div className="text-sm text-gray-600 ml-6">
                              Landmark: {order.landmark}
                            </div>
                          )}
                        </div>

                        {/* Order Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                            </span>
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(order.total)}
                          </div>
                          {order.eta && (
                            <div className="text-sm text-gray-600">
                              ETA: {order.eta}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        {' '}
                        ({order.items.map(item => `${item.quantity}×${item.name}`).join(', ')})
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg group-hover:bg-blue-700">
                        <span className="font-semibold">Manage</span>
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
