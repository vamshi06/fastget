import { getAdminOrderStats } from '@/lib/db';
import { getStockAlertCounts, LOW_STOCK_THRESHOLD } from '@/lib/products';
import { requireAdminPage } from '@/lib/auth';
import { adminOrderFiltersToQuery, daysAgoInIndia, todayInIndia } from '@/lib/admin-order-filters';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import {
  ShoppingBag, TrendingUp, CheckCircle2, Truck,
  Clock, XCircle, BarChart3, ArrowRight, AlertCircle, PackageX,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

function rangeDates(range: RangeKey): { dateFrom?: string; dateTo?: string } {
  const today = todayInIndia();
  switch (range) {
    case 'today': return { dateFrom: today, dateTo: today };
    case '7d':    return { dateFrom: daysAgoInIndia(6), dateTo: today };
    case '30d':   return { dateFrom: daysAgoInIndia(29), dateTo: today };
    default:      return {};
  }
}

export default async function AdminDashboard({ searchParams }: { searchParams: { range?: string } }) {
  await requireAdminPage();

  const range: RangeKey = RANGES.some((r) => r.key === searchParams.range)
    ? (searchParams.range as RangeKey)
    : 'all';
  const rangeLabel = RANGES.find((r) => r.key === range)!.label;
  const dates = rangeDates(range);
  const [stats, stockAlerts] = await Promise.all([
    getAdminOrderStats(dates.dateFrom, dates.dateTo),
    getStockAlertCounts(),
  ]);

  // Stock is current state, not tied to the date range, so it shows on every tab.
  const stockBanner = stockAlerts && stockAlerts.outOfStock > 0 && (
    <Link
      href={'/admin/products?stock=out' as any}
      className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 hover:border-red-400 transition-colors"
    >
      <PackageX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-red-900 text-sm">
          {stockAlerts.outOfStock} product{stockAlerts.outOfStock !== 1 ? 's are' : ' is'} out of stock
        </p>
        <p className="text-red-800 text-sm">
          Customers see {stockAlerts.outOfStock !== 1 ? 'them' : 'it'} as out of stock. Restock and update the count, or discontinue.
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-red-700 mt-1" />
    </Link>
  );

  // Link into the order list pre-filtered to this range (and optionally a status).
  const ordersHref = (status?: OrderStatus) =>
    `/admin/orders?${adminOrderFiltersToQuery({ ...dates, status })}`;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Dashboard</h1>
        <p className="text-brand-slate text-sm mt-1">FastGet Admin - Overview</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/admin?range=${r.key}` as any}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              range === r.key
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );

  if (!stats) {
    return (
      <div className="space-y-8">
        {header}
        {stockBanner}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Couldn&apos;t load order stats</h3>
            <p className="text-red-800 text-sm">The database didn&apos;t respond. Refresh the page to try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const { statusCounts, totalOrders, bookedRevenue, deliveredRevenue } = stats;
  const needsAction = (statusCounts.received || 0) + (statusCounts.eta_assigned || 0);

  const statCards = [
    {
      label: 'Orders',
      value: totalOrders.toLocaleString('en-IN'),
      sub: rangeLabel,
      icon: ShoppingBag,
      color: 'bg-primary-50 text-brand-primary',
      href: ordersHref(),
    },
    {
      label: 'Revenue',
      value: formatCurrency(bookedRevenue),
      sub: `Excludes cancelled & unpaid · ${formatCurrency(deliveredRevenue)} delivered`,
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
      href: ordersHref(),
    },
    {
      label: 'Needs action',
      value: needsAction.toLocaleString('en-IN'),
      sub: `${statusCounts.received || 0} new · ${statusCounts.eta_assigned || 0} awaiting dispatch`,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      href: ordersHref('received'),
    },
    {
      label: 'Out for delivery',
      value: (statusCounts.out_for_delivery || 0).toLocaleString('en-IN'),
      sub: 'On the way',
      icon: Truck,
      color: 'bg-primary-50 text-brand-primary',
      href: ordersHref('out_for_delivery'),
    },
    {
      label: 'Delivered',
      value: (statusCounts.delivered || 0).toLocaleString('en-IN'),
      sub: 'Successfully fulfilled',
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
      href: ordersHref('delivered'),
    },
    {
      label: 'Cancelled',
      value: (statusCounts.cancelled || 0).toLocaleString('en-IN'),
      sub: 'Cancelled orders',
      icon: XCircle,
      color: 'bg-red-50 text-red-600',
      href: ordersHref('cancelled'),
    },
    ...(stockAlerts
      ? [{
          label: 'Stock alerts',
          value: stockAlerts.outOfStock.toLocaleString('en-IN'),
          sub: `out of stock · ${stockAlerts.lowStock} low (≤${LOW_STOCK_THRESHOLD} left) · right now`,
          icon: PackageX,
          color: stockAlerts.outOfStock > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
          href: stockAlerts.outOfStock > 0 || stockAlerts.lowStock === 0 ? '/admin/products?stock=out' : '/admin/products?stock=low',
        }]
      : []),
  ];

  const breakdown = (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[])
    .filter((status) => (statusCounts[status] || 0) > 0);

  return (
    <div className="space-y-8">
      {header}
      {stockBanner}

      {/* Stat Cards - each opens the matching filtered order list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, href }) => (
          <Link key={label} href={href as any} className="card p-5 hover:shadow-md hover:border-brand-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-brand-slate">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-brand-charcoal">{value}</p>
            <p className="text-xs text-brand-steel mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="font-bold text-brand-charcoal mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-primary" />
          Quick Actions
        </h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/orders" className="btn-primary">
            View All Orders <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/admin/products" className="btn-secondary">
            Manage Products
          </Link>
          <Link href="/agent-dashboard" className="btn-secondary">
            Agent Dashboard
          </Link>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="card p-6">
        <h2 className="font-bold text-brand-charcoal mb-4">Order Status Breakdown · {rangeLabel}</h2>
        {breakdown.length === 0 ? (
          <p className="text-brand-slate text-sm">No orders in this period.</p>
        ) : (
          <div className="space-y-4">
            {breakdown.map((status) => {
              const count = statusCounts[status] || 0;
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              return (
                <Link key={status} href={ordersHref(status) as any} className="block group">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold group-hover:text-brand-primary transition-colors">{ORDER_STATUS_LABELS[status]}</span>
                    <span className="text-brand-slate">{count} orders · {pct}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
