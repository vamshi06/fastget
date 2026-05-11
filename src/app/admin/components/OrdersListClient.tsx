'use client';

import { useState } from 'react';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface OrdersListProps {
  orders: Order[];
  token?: string;
}

export function OrdersListClient({ orders, token }: OrdersListProps) {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
    (searchParams.get('status') as OrderStatus | 'all') || 'all'
  );
  const [nameFilter, setNameFilter] = useState(searchParams.get('name') || '');
  const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('dateFrom') || '');
  const [dateToFilter, setDateToFilter] = useState(searchParams.get('dateTo') || '');

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    if (nameFilter) {
      const searchTerm = nameFilter.toLowerCase();
      const matchesName = order.customerName.toLowerCase().includes(searchTerm);
      const matchesPhone = order.customerPhone.includes(searchTerm);
      const matchesEmail = order.customerPhone.includes(searchTerm);
      if (!matchesName && !matchesPhone && !matchesEmail) {
        return false;
      }
    }

    if (dateFromFilter) {
      const orderDate = new Date(order.createdAt);
      const fromDate = new Date(dateFromFilter);
      if (orderDate < fromDate) {
        return false;
      }
    }

    if (dateToFilter) {
      const orderDate = new Date(order.createdAt);
      const toDate = new Date(dateToFilter);
      // Set toDate to end of day
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) {
        return false;
      }
    }

    return true;
  });

  const handleReset = () => {
    setStatusFilter('all');
    setNameFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white rounded-xl border border-blue-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 duration-500">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            >
              <option value="all" className="text-gray-900">All Statuses</option>
              <option value="received" className="text-gray-900">Received</option>
              <option value="eta_assigned" className="text-gray-900">ETA Assigned</option>
              <option value="out_for_delivery" className="text-gray-900">Out for Delivery</option>
              <option value="delivered" className="text-gray-900">Delivered</option>
              <option value="cancelled" className="text-gray-900">Cancelled</option>
            </select>
          </div>

          {/* Name/Email Filter */}
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-150">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Name/Phone
            </label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search customer..."
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg bg-white text-gray-900 placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            />
          </div>

          {/* Date From */}
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            />
          </div>

          {/* Date To */}
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-250">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400"
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline transition-all duration-200 active:scale-95"
        >
          ↺ Reset Filters
        </button>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Orders <span className="text-blue-600">({filteredOrders.length})</span>
          </h3>
          <Link
            href={`/admin/api/orders/export?status=${statusFilter}&name=${nameFilter}&dateFrom=${dateFromFilter}&dateTo=${dateToFilter}${token ? `&token=${token}` : ''}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>📥</span>
            Export CSV
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 group animate-in fade-in slide-in-from-left-2 duration-300"
                    style={{
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      ₹{order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}${token ? `?token=${token}` : ''}`}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline transition-all duration-200 active:scale-95"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const statusColors: Record<OrderStatus, string> = {
    received: 'bg-blue-100 text-blue-800 border border-blue-300',
    eta_assigned: 'bg-purple-100 text-purple-800 border border-purple-300',
    out_for_delivery: 'bg-amber-100 text-amber-800 border border-amber-300',
    delivered: 'bg-green-100 text-green-800 border border-green-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColors[status]} transition-all duration-200 group-hover:scale-105`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
