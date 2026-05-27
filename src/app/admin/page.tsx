import { getRecentOrders } from '@/lib/db';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';
import {
  ShoppingBag, TrendingUp, CheckCircle2, Truck,
  Clock, XCircle, BarChart3, ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getMetrics() {
  const orders = await getRecentOrders(500);

  const totalOrders   = orders.length;
  const totalRevenue  = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status as OrderStatus] = (acc[order.status as OrderStatus] || 0) + 1;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );

  return { totalOrders, totalRevenue, statusCounts };
}

export default async function AdminDashboard() {
  const { totalOrders, totalRevenue, statusCounts } = await getMetrics();

  const statCards = [
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      sub: 'All time',
      icon: ShoppingBag,
      color: 'bg-primary-50 text-brand-primary',
    },
    {
      label: 'Total Revenue',
      value: `₹${(totalRevenue / 100).toFixed(0)}`,
      sub: 'Gross revenue',
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Delivered',
      value: (statusCounts.delivered || 0).toLocaleString(),
      sub: 'Successfully fulfilled',
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'In Transit',
      value: (statusCounts.out_for_delivery || 0).toLocaleString(),
      sub: 'Out for delivery',
      icon: Truck,
      color: 'bg-primary-50 text-brand-primary',
    },
    {
      label: 'Pending',
      value: ((statusCounts.received || 0) + (statusCounts.eta_assigned || 0)).toLocaleString(),
      sub: 'Awaiting dispatch',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Cancelled',
      value: (statusCounts.cancelled || 0).toLocaleString(),
      sub: 'Cancelled orders',
      icon: XCircle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Dashboard</h1>
        <p className="text-brand-slate text-sm mt-1">FastGet Admin — Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-brand-slate">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-brand-charcoal">{value}</p>
            <p className="text-xs text-brand-steel mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="font-bold text-brand-charcoal mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-primary" />
          Quick Actions
        </h2>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/admin/orders"
            className="btn-primary"
          >
            View All Orders <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/admin/products"
            className="btn-secondary"
          >
            Manage Products
          </Link>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="card p-6">
        <h2 className="font-bold text-brand-charcoal mb-4">Order Status Breakdown</h2>
        {Object.keys(statusCounts).length === 0 ? (
          <p className="text-brand-slate text-sm">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="text-brand-slate">{count} orders · {pct}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
