import { getRecentOrders } from '@/lib/db';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';

interface MetricCard {
  label: string;
  value: string | number;
  color: string;
  bgGradient: string;
  delay: string;
}

async function getMetrics() {
  // Use Neon/Postgres as the single source of truth — not Google Sheets
  const orders = await getRecentOrders(500);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status as OrderStatus] = (acc[order.status as OrderStatus] || 0) + 1;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );

  return { totalOrders, totalRevenue, statusCounts };
}

export default async function AdminDashboard() {
  const { totalOrders, totalRevenue, statusCounts } = await getMetrics();

  const metrics: MetricCard[] = [
    {
      label: 'Total Orders',
      value: totalOrders,
      color: 'text-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 border-blue-200',
      delay: '0',
    },
    {
      label: 'Total Revenue',
      value: `₹${(totalRevenue / 100).toFixed(2)}`,
      color: 'text-green-600',
      bgGradient: 'from-green-50 to-green-100 border-green-200',
      delay: '100',
    },
    {
      label: 'Orders Delivered',
      value: statusCounts.delivered || 0,
      color: 'text-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100 border-emerald-200',
      delay: '200',
    },
    {
      label: 'In Transit',
      value: statusCounts.out_for_delivery || 0,
      color: 'text-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 border-amber-200',
      delay: '300',
    },
    {
      label: 'Pending',
      value: (statusCounts.received || 0) + (statusCounts.eta_assigned || 0),
      color: 'text-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 border-purple-200',
      delay: '400',
    },
    {
      label: 'Cancelled',
      value: statusCounts.cancelled || 0,
      color: 'text-red-600',
      bgGradient: 'from-red-50 to-red-100 border-red-200',
      delay: '500',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-gray-600 text-lg">Overview of FastGet orders and metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              animation: `fadeInUp 0.6s ease-out ${metric.delay}ms forwards`,
              opacity: 0,
            }}
            className="group"
          >
            <div
              className={`bg-gradient-to-br ${metric.bgGradient} border rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-default`}
            >
              <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-700 transition-colors">
                {metric.label}
              </p>
              <p className={`text-4xl font-bold ${metric.color} mt-3 transition-colors`}>
                {metric.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div
        className="bg-white rounded-xl border border-blue-200 p-8 shadow-sm hover:shadow-md transition-all duration-300"
        style={{
          animation: `fadeInUp 0.6s ease-out 600ms forwards`,
          opacity: 0,
        }}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="flex gap-4 flex-wrap">
          <Link
            href="/admin/orders"
            className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold overflow-hidden transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="relative z-10">View All Orders</span>
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </Link>
          <button
            disabled
            className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-semibold opacity-60"
          >
            Generate Report (Coming Soon)
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div
        className="bg-white rounded-xl border border-blue-200 p-8 shadow-sm hover:shadow-md transition-all duration-300"
        style={{
          animation: `fadeInUp 0.6s ease-out 700ms forwards`,
          opacity: 0,
        }}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Order Status Breakdown</h3>
        {Object.keys(statusCounts).length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(statusCounts).map(([status, count], index) => (
              <div
                key={status}
                className="flex items-center justify-between group"
                style={{
                  animation: `fadeInLeft 0.5s ease-out ${100 + index * 50}ms forwards`,
                  opacity: 0,
                }}
              >
                <span className="text-gray-700 font-medium capitalize group-hover:text-blue-600 transition-colors">
                  {status.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-4 flex-1 ml-4">
                  <div className="w-40 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-900 font-bold w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
