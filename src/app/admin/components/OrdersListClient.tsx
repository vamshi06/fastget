'use client';

import { useState } from 'react';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface OrdersListProps {
  orders: Order[];
}

const inputCls = 'w-full px-4 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-brand-charcoal font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-all duration-200';

export function OrdersListClient({ orders }: OrdersListProps) {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
    (searchParams.get('status') as OrderStatus | 'all') || 'all'
  );
  const [nameFilter, setNameFilter] = useState(searchParams.get('name') || '');
  const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('dateFrom') || '');
  const [dateToFilter, setDateToFilter] = useState(searchParams.get('dateTo') || '');

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (nameFilter) {
      const searchTerm = nameFilter.toLowerCase();
      const matchesName = order.customerName.toLowerCase().includes(searchTerm);
      const matchesPhone = order.customerPhone.includes(searchTerm);
      if (!matchesName && !matchesPhone) return false;
    }
    if (dateFromFilter) {
      const orderDate = new Date(order.createdAt);
      const fromDate = new Date(dateFromFilter);
      if (orderDate < fromDate) return false;
    }
    if (dateToFilter) {
      const orderDate = new Date(order.createdAt);
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) return false;
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
      <div className="card p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <h3 className="text-lg font-bold text-brand-charcoal">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className={inputCls}
            >
              <option value="all">All Statuses</option>
              <option value="received">Received</option>
              <option value="eta_assigned">ETA Assigned</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Customer Name/Phone
            </label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search customer..."
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              From Date
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              To Date
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          className="text-brand-primary hover:text-brand-dark font-semibold text-sm transition-colors duration-200"
        >
          ↺ Reset Filters
        </button>
      </div>

      {/* Results Table */}
      <div className="card overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <div className="px-6 py-5 bg-gradient-to-r from-primary-50 to-white border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-charcoal">
            Orders <span className="text-brand-primary">({filteredOrders.length})</span>
          </h3>
          <Link
            href={`/admin/api/orders/export?status=${statusFilter}&name=${nameFilter}&dateFrom=${dateFromFilter}&dateTo=${dateToFilter}`}
            className="btn-primary text-sm py-2"
          >
            Export CSV
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-fog border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="border-b border-neutral-100 hover:bg-primary-50 transition-all duration-200 group animate-in fade-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-brand-charcoal group-hover:text-brand-primary transition-colors">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-brand-charcoal">{order.customerName}</div>
                      <div className="text-xs text-brand-steel">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-slate">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-brand-charcoal">
                      ₹{order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-brand-primary hover:text-brand-dark font-semibold text-sm transition-colors duration-200"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-slate font-medium">
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
    received: 'bg-amber-100 text-amber-800 border border-amber-300',
    eta_assigned: 'bg-primary-100 text-primary-700 border border-primary-200',
    out_for_delivery: 'bg-neutral-100 text-brand-graphite border border-neutral-200',
    delivered: 'bg-green-100 text-green-800 border border-green-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]} transition-all duration-200 group-hover:scale-105`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
