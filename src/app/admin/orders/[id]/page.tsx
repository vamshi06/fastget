import { getOrderById } from '@/lib/db';
import { getProductCodeByVariantSku } from '@/lib/products';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS, StatusHistoryEntry } from '@/types';
import { requireAdminPage } from '@/lib/auth';
import { formatCurrency, formatDuration, formatOrderNumber, orderCoinDiscount } from '@/lib/utils';
import { DeleteOrderButton } from './DeleteOrderButton';
import { AdminOrderStatusCard } from './AdminOrderStatusCard';
import { getUserById } from '@/lib/users';
import { REFERRAL_REWARD_RUPEES } from '@/lib/referral';
import { MarkReferralPaidButton } from '../../referrals/MarkReferralPaidButton';
import { AlertTriangle, PackageX } from 'lucide-react';
import { getAvailableStockByProductCodes } from '@/lib/products';
import { findStockProblems, stockProblemLabel, type StockProblem } from '@/lib/order-stock';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireAdminPage();
  const order = await getOrderById(params.id);

  if (!order) {
    notFound();
  }

  // Resolve each line item's variant SKU to its product code so admins can
  // click through to the product's details page. Items with no matching
  // variant (e.g. discontinued products, legacy orders)
  // resolve to null and render without a link.
  const isOpenOrder = order.status !== 'delivered' && order.status !== 'cancelled';
  const [itemProductCodes, referrer, customer, stockBySku] = await Promise.all([
    Promise.all(order.items.map((item) => getProductCodeByVariantSku(item.sku))),
    order.referrerUserId ? getUserById(order.referrerUserId) : Promise.resolve(null),
    order.userId ? getUserById(order.userId) : Promise.resolve(null),
    // Stock only matters while the order still has to be fulfilled.
    isOpenOrder ? getAvailableStockByProductCodes(order.items.map((i) => i.sku)) : Promise.resolve(new Map<string, number | null>()),
  ]);
  const stockProblems = isOpenOrder ? findStockProblems(order.items, stockBySku) : new Map<string, StockProblem>();

  const createdDate = new Date(order.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    // This page renders on the server (the production server runs in UTC), so the
    // timezone must be pinned explicitly - 'en-IN' only sets formatting
    // conventions, not the clock. Without this, times were off by +5:30.
    timeZone: 'Asia/Kolkata',
  });

  const statusColors: Record<string, string> = {
    received: 'bg-amber-100 border-amber-300 text-amber-800',
    eta_assigned: 'bg-primary-100 border-primary-300 text-primary-700',
    out_for_delivery: 'bg-neutral-100 border-neutral-300 text-brand-graphite',
    delivered: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
  };

  // Orders written before status_history existed have an empty array - fall
  // back to a single 'received' entry at created_at so the timeline still
  // renders something sensible instead of looking broken.
  const timeline: StatusHistoryEntry[] =
    order.statusHistory && order.statusHistory.length > 0
      ? order.statusHistory
      : [{ status: order.status, timestamp: order.createdAt }];

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const firstEntryTime = new Date(timeline[0].timestamp).getTime();
  const lastEntryTime = new Date(timeline[timeline.length - 1].timestamp).getTime();
  // Total time the order has taken so far: from first entry to either its
  // final status (delivered/cancelled) or now, if it's still in progress.
  const totalDurationMs = (isTerminal ? lastEntryTime : Date.now()) - firstEntryTime;

  const paidOnline = order.paymentMethod === 'razorpay' && order.paymentStatus === 'captured';
  const coinDiscount = orderCoinDiscount(order);
  const paymentLabel =
    order.paymentMethod === 'cod'
      ? 'Cash on Delivery'
      : paidOnline
        ? 'Paid online (Razorpay)'
        : 'Online - payment pending';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">Order {formatOrderNumber(order)}</h2>
          <p className="text-xs text-brand-steel break-all">
            Internal ID: <span className="font-mono">{order.id}</span>
          </p>
        </div>
        <Link href="/admin/orders" className="btn-secondary px-4 py-2 text-sm">
          ← Back to orders
        </Link>
      </div>

      {/* Stock warning - open orders containing items without enough recorded stock */}
      {stockProblems.size > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <PackageX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-bold">
              {stockProblems.size} item{stockProblems.size !== 1 ? 's' : ''} in this order {stockProblems.size !== 1 ? "don't" : "doesn't"} have enough stock
            </p>
            <p className="mt-0.5">
              Check availability before confirming. If you can&apos;t fulfil it, call the customer or cancel the order.
              Marked below on each item.
            </p>
          </div>
        </div>
      )}

      {/* Refund reminder - cancelled orders that were paid online */}
      {order.status === 'cancelled' && paidOnline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Refund needed: {formatCurrency(order.total)} was paid online</p>
            <p className="mt-0.5">
              Cancelling doesn&apos;t refund automatically. If you haven&apos;t already, refund this payment from the
              Razorpay dashboard (Payments
              {order.razorpayPaymentId && <> → <span className="font-mono">{order.razorpayPaymentId}</span></>}).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-brand-charcoal mb-4">Status</h3>
            <div className="space-y-3">
              <div className={`inline-block px-4 py-2 rounded-xl border font-bold text-sm ${statusColors[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </div>
              <p className="text-brand-slate text-sm leading-relaxed">{ORDER_STATUS_DESCRIPTIONS[order.status]}</p>
              {order.eta && (
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <p className="text-primary-700 font-semibold text-sm">
                    Estimated Delivery: <span className="font-mono">{order.eta}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status actions */}
          <AdminOrderStatusCard
            orderId={order.id}
            status={order.status}
            customerName={order.customerName}
            paidOnlineAmount={paidOnline ? order.total : undefined}
          />

          {/* Customer Information */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Customer Information</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <InfoRow label="Name" value={order.customerName} />
              <InfoRow
                label="Phone"
                value={<a href={`tel:${order.customerPhone}`} className="text-brand-primary hover:underline">{order.customerPhone}</a>}
              />
              <InfoRow
                label="Email"
                value={customer?.email
                  ? <a href={`mailto:${customer.email}`} className="text-brand-primary hover:underline break-all">{customer.email}</a>
                  : <span className="text-brand-steel font-normal">-</span>}
              />
              <InfoRow
                label="Account"
                value={customer
                  ? <Link href={`/admin/orders?q=${encodeURIComponent(order.customerPhone)}` as any} className="text-brand-primary hover:underline">Registered customer · see their orders</Link>
                  : <span className="text-brand-steel font-normal">Guest order (no account)</span>}
              />
              <div className="sm:col-span-2">
                <InfoRow
                  label="Delivery Address"
                  value={
                    <>
                      {order.siteAddress}
                      {order.sitePincode && <> - {order.sitePincode}</>}
                      {order.landmark && (
                        <span className="block text-sm text-brand-slate font-normal mt-1">Landmark: {order.landmark}</span>
                      )}
                      {order.siteLat != null && order.siteLng != null && (
                        <a
                          href={`https://maps.google.com/?q=${order.siteLat},${order.siteLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-sm text-brand-primary hover:underline"
                        >
                          📍 Open site location in Maps
                        </a>
                      )}
                    </>
                  }
                />
              </div>
              {order.gstin && (
                <div className="sm:col-span-2">
                  <InfoRow
                    label="GST details"
                    value={<>{order.businessName && <>{order.businessName} · </>}<span className="font-mono">{order.gstin}</span></>}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Payment Information */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Delivery &amp; Payment</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <InfoRow label="Delivery Type" value={order.deliveryType === 'urgent' ? 'Urgent' : 'Scheduled'} />
              {order.scheduledTime && (
                <InfoRow
                  label="Scheduled Time"
                  value={new Date(order.scheduledTime).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                  })}
                />
              )}
              <InfoRow
                label="Payment"
                value={
                  <span className={order.paymentMethod === 'cod' ? '' : paidOnline ? 'text-green-700' : 'text-amber-700'}>
                    {paymentLabel}
                  </span>
                }
              />
              {order.razorpayPaymentId && (
                <InfoRow label="Razorpay Payment ID" value={<span className="font-mono text-sm break-all">{order.razorpayPaymentId}</span>} />
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Order Items</h3>
            <div className="space-y-0">
              {order.items.map((item, index) => {
                const productCode = itemProductCodes[index];
                const stockProblem = stockProblems.get(item.sku);
                const itemContent = (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-brand-charcoal">
                        {item.name}
                        {productCode && (
                          <span className="ml-2 text-xs font-semibold text-brand-primary align-middle">View product →</span>
                        )}
                      </p>
                      <p className="text-xs text-brand-steel font-mono">SKU: {item.sku}</p>
                      {stockProblem && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {stockProblemLabel(stockProblem)}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-brand-slate">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                      <p className="font-bold text-brand-charcoal">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </>
                );

                const rowClassName =
                  'flex items-start justify-between gap-4 py-4 px-3 border-b border-neutral-100 last:border-0 hover:bg-primary-50 transition-colors duration-200 rounded-xl';

                return productCode ? (
                  <Link
                    key={index}
                    href={`/product/${productCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rowClassName}
                  >
                    {itemContent}
                  </Link>
                ) : (
                  <div key={index} className={rowClassName}>
                    {itemContent}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - Payment & Timestamps */}
        <div className="space-y-6">
          {/* Payment Summary - every line that makes up the total */}
          <div className="bg-primary-50 rounded-2xl border border-primary-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-brand-charcoal mb-5">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <SummaryRow label="Convenience fee" value={formatCurrency(order.convenienceFee)} />
              {order.discount > 0 && (
                <SummaryRow label="First-order coupon" value={`−${formatCurrency(order.discount)}`} green />
              )}
              {coinDiscount > 0 && (
                <SummaryRow label={`Coins used (${coinDiscount})`} value={`−${formatCurrency(coinDiscount)}`} green />
              )}
              <div className="border-t border-primary-200 pt-3 mt-3 flex justify-between items-center bg-white p-3 rounded-xl">
                <span className="font-bold text-brand-charcoal">
                  Total{' '}
                  <span className="block text-xs font-medium text-brand-slate">
                    {order.paymentMethod === 'cod' ? 'to collect on delivery' : paidOnline ? 'paid online' : 'payment pending'}
                  </span>
                </span>
                <span className="text-2xl font-black text-brand-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Referral payout */}
          {order.referralCode && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-brand-charcoal mb-4">Referral</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-brand-slate">Code: </span>
                  <span className="font-mono font-bold tracking-wider text-brand-charcoal">{order.referralCode}</span>
                </p>
                {referrer ? (
                  <div>
                    <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">Referrer - pay to</p>
                    <p className="font-semibold text-brand-charcoal mt-1">{referrer.name}</p>
                    <p className="text-brand-slate">{referrer.phone}</p>
                    <p className="text-brand-slate">{referrer.email}</p>
                  </div>
                ) : (
                  <p className="text-red-600">Referrer account no longer exists - no payout.</p>
                )}
                {order.referralPaidAt ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800">
                    <p className="font-bold">Paid ₹{order.referralPayoutAmount ?? REFERRAL_REWARD_RUPEES}</p>
                    <p className="text-xs mt-0.5">
                      {new Date(order.referralPaidAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      {order.referralPayoutRef && ` · Ref: ${order.referralPayoutRef}`}
                    </p>
                  </div>
                ) : order.status === 'delivered' && referrer ? (
                  <MarkReferralPaidButton orderId={order.id} amount={REFERRAL_REWARD_RUPEES} />
                ) : order.status === 'cancelled' ? (
                  <p className="text-brand-slate">Order cancelled - no payout.</p>
                ) : referrer ? (
                  <p className="text-brand-slate">Pay ₹{REFERRAL_REWARD_RUPEES} to the referrer once this order is delivered.</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5 gap-2">
              <h3 className="text-lg font-bold text-brand-charcoal">Status Timeline</h3>
              <span className="text-xs font-bold text-brand-primary bg-primary-50 px-3 py-1 rounded-full whitespace-nowrap">
                {isTerminal ? 'Total time' : 'Elapsed'}: {formatDuration(totalDurationMs)}
              </span>
            </div>
            <ol>
              {timeline.map((entry, index) => {
                const entryDate = new Date(entry.timestamp);
                const isLast = index === timeline.length - 1;
                const stageDurationMs =
                  index > 0 ? entryDate.getTime() - new Date(timeline[index - 1].timestamp).getTime() : null;

                return (
                  <li
                    key={`${entry.status}-${entry.timestamp}`}
                    className={`flex gap-3 pl-1.5 ${isLast ? '' : 'border-l-2 border-neutral-200 pb-4'}`}
                  >
                    <span
                      className={`-ml-[7px] mt-1 w-3 h-3 rounded-full flex-shrink-0 border-2 ${
                        isLast ? 'bg-brand-primary border-brand-primary' : 'bg-white border-neutral-300'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="pb-4">
                      <p className="font-bold text-brand-charcoal text-sm">{ORDER_STATUS_LABELS[entry.status]}</p>
                      <p className="text-xs font-mono text-brand-slate mt-0.5">
                        {entryDate.toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </p>
                      {stageDurationMs !== null && (
                        <p className="text-xs text-brand-steel mt-0.5">
                          {formatDuration(stageDurationMs)} after previous step
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {!isTerminal && (
              <p className="text-xs text-brand-slate italic -mt-2">Order is still in progress - timer is running.</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-brand-charcoal mb-3">Placed</h3>
            <p className="text-sm font-semibold text-brand-charcoal">{formattedDate}</p>
          </div>

          {/* Danger zone - deleting is only possible once an order is cancelled */}
          <div className="card p-6 border-red-100">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-2">Danger zone</h3>
            {order.status === 'cancelled' ? (
              <>
                <p className="text-sm text-brand-slate mb-3">
                  Permanently delete this cancelled order, e.g. a test or duplicate order.
                </p>
                <DeleteOrderButton orderId={order.id} />
              </>
            ) : (
              <p className="text-sm text-brand-slate">
                Only cancelled orders can be deleted. To remove this order, cancel it first.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl hover:bg-primary-50 transition-colors duration-200">
      <p className="text-xs text-brand-steel font-semibold uppercase tracking-wide">{label}</p>
      <div className="font-semibold text-brand-charcoal mt-1">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-brand-slate font-medium">{label}</span>
      <span className={`font-bold ${green ? 'text-green-700' : 'text-brand-charcoal'}`}>{value}</span>
    </div>
  );
}
