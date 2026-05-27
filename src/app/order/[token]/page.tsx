"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_DESCRIPTIONS,
} from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MapPin,
  Phone,
  User,
  AlertCircle,
  ChevronLeft,
  Copy,
  RefreshCw,
  Download,
} from "lucide-react";

const statusIcons: Record<
  OrderStatus,
  React.ComponentType<{ className?: string }>
> = {
  received: Package,
  eta_assigned: Clock,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const statusColors: Record<OrderStatus, string> = {
  received: "bg-amber-100 text-amber-800 border-amber-200",
  eta_assigned: "bg-primary-100 text-primary-700 border-primary-200",
  out_for_delivery: "bg-neutral-100 text-brand-graphite border-neutral-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function OrderStatusPage() {
  const params = useParams();
  const token = (params.token as string).toLowerCase();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch order");
      }

      setOrder(data.order);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchOrder();
    }
  }, [token, fetchOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrder();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-fog flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-slate">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-brand-fog py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2">
            Order Not Found
          </h1>
          <p className="text-brand-slate mb-8">
            {error || "We could not find an order with this token."}
          </p>
          <Link href="/order" className="btn-primary inline-flex px-6 py-3">
            <ChevronLeft className="w-5 h-5" />
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status];

  const statusSequence: OrderStatus[] = [
    "received",
    "eta_assigned",
    "out_for_delivery",
    "delivered",
  ];
  const currentStatusIndex = statusSequence.indexOf(order.status);
  const isOrderCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal font-medium text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-brand-slate hover:text-brand-charcoal rounded-xl hover:bg-white transition-all disabled:opacity-50 text-sm font-medium"
            title="Refresh order status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Order Status Card */}
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-brand-charcoal">Order #{order.statusToken.toUpperCase()}</h1>
              <p className="text-brand-slate mt-1 text-sm">
                Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </p>
              {lastUpdated && (
                <p className="text-xs text-brand-steel mt-1">
                  Last updated: {formatTime(lastUpdated.toISOString())}
                </p>
              )}
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-full border font-semibold text-sm ${statusColors[order.status]}`}>
              <StatusIcon className="w-5 h-5" />
              <span>{ORDER_STATUS_LABELS[order.status]}</span>
            </div>
          </div>

          <div className="bg-brand-fog rounded-xl p-4 border border-neutral-100">
            <p className="text-brand-slate text-sm leading-relaxed">
              {ORDER_STATUS_DESCRIPTIONS[order.status]}
            </p>
            {order.eta &&
              order.status !== "delivered" &&
              order.status !== "cancelled" && (
                <div className="mt-3 flex items-center gap-2 text-brand-primary font-semibold text-sm">
                  <Clock className="w-4 h-4" />
                  Estimated delivery: {order.eta}
                </div>
              )}
            {order.status === "delivered" && (
              <p className="mt-3 text-green-700 font-semibold text-sm">
                Delivery completed successfully
              </p>
            )}
            {order.status === "cancelled" && (
              <p className="mt-3 text-red-700 font-semibold text-sm">
                This order has been cancelled
              </p>
            )}
          </div>
        </div>

        {/* Order Progress Timeline */}
        {!isOrderCancelled && (
          <div className="card p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold text-brand-charcoal mb-6">
              Order Timeline
            </h2>
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-1 bg-neutral-200 rounded"></div>

              {currentStatusIndex >= 0 && (
                <div
                  className="absolute top-5 left-0 h-1 bg-brand-primary rounded transition-all duration-500"
                  style={{
                    width: `${(currentStatusIndex / (statusSequence.length - 1)) * 100}%`,
                  }}
                ></div>
              )}

              <div className="relative flex justify-between">
                {statusSequence.map((status, index) => {
                  const isCompleted = currentStatusIndex > index;
                  const isCurrent = currentStatusIndex === index;
                  const Icon = statusIcons[status];

                  return (
                    <div key={status} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                          isCurrent
                            ? "bg-brand-primary text-white shadow-lg scale-110"
                            : isCompleted
                              ? "bg-green-600 text-white"
                              : "bg-neutral-200 text-brand-steel"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`mt-3 text-xs font-semibold text-center ${isCurrent ? "text-brand-primary" : isCompleted ? "text-green-600" : "text-brand-steel"}`}
                      >
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Delivery Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Details */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-primary" />
                Delivery Address
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-brand-steel mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-brand-charcoal">{order.customerName}</p>
                    <p className="text-brand-slate text-sm">{order.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-steel mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-brand-charcoal font-medium">{order.siteAddress}</p>
                    {order.landmark && (
                      <p className="text-brand-slate text-sm mt-1">
                        Landmark: {order.landmark}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-2 border-t border-neutral-100">
                  <Clock className="w-5 h-5 text-brand-steel mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-brand-charcoal font-medium">
                      {order.deliveryType === "urgent" ? "Urgent Delivery" : "Scheduled Delivery"}
                    </p>
                    {order.scheduledTime && (
                      <p className="text-brand-slate text-sm">
                        {formatDate(order.scheduledTime)} at {formatTime(order.scheduledTime)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4">
                Order Items ({order.items.length})
              </h2>
              <div className="space-y-1">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                  >
                    <div className="flex-grow">
                      <h3 className="font-medium text-brand-charcoal text-sm">{item.name}</h3>
                      <p className="text-xs text-brand-steel">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-brand-charcoal text-sm">× {item.quantity}</p>
                      <p className="text-xs text-brand-slate">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Payment & Actions */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4">
                Payment Details
              </h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Subtotal</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>Convenience Fee</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(order.convenienceFee)}</span>
                </div>
                <div className="border-t border-neutral-100 pt-3 flex justify-between">
                  <span className="font-bold text-brand-charcoal">Total Amount</span>
                  <span className="text-xl font-black text-brand-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
              <div className="bg-brand-fog rounded-xl p-3 text-sm border border-neutral-100">
                <p className="text-brand-slate">
                  <span className="font-semibold text-brand-charcoal">Payment Method:</span>
                </p>
                <p className="text-brand-charcoal font-medium mt-1">Cash on Delivery</p>
              </div>
            </div>

            {/* Actions */}
            <div className="card p-6">
              <h3 className="font-bold text-brand-charcoal mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleCopyToken}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy Order Token"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Print Receipt
                </button>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-primary-50 rounded-2xl border border-primary-200 p-6">
              <h3 className="font-bold text-brand-charcoal mb-2">Need Help?</h3>
              <p className="text-sm text-brand-slate mb-4">
                Contact our support team if you have any questions about your order.
              </p>
              <a
                href="tel:+919999999999"
                className="btn-primary w-full py-2.5 text-sm"
              >
                <Phone className="w-4 h-4" />
                Call Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
