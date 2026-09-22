"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import { useToast } from "@/components/ToastContext";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
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
  const router = useRouter();
  const token = (params.token as string).toLowerCase();
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const t = useTranslations("order");

  const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    received: t("statusLabels.received"),
    eta_assigned: t("statusLabels.eta_assigned"),
    out_for_delivery: t("statusLabels.out_for_delivery"),
    delivered: t("statusLabels.delivered"),
    cancelled: t("statusLabels.cancelled"),
  };
  const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
    received: t("statusDescriptions.received"),
    eta_assigned: t("statusDescriptions.eta_assigned"),
    out_for_delivery: t("statusDescriptions.out_for_delivery"),
    delivered: t("statusDescriptions.delivered"),
    cancelled: t("statusDescriptions.cancelled"),
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${token}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('fetchOrderFailed'));
      }

      setOrder(data.order);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadOrderFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, t]);

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

  // Clear cart once when a Razorpay payment is confirmed
  useEffect(() => {
    if (order?.paymentMethod === 'razorpay' && order?.paymentStatus === 'captured') {
      clearCart();
    }
  }, [order?.paymentMethod, order?.paymentStatus, clearCart]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${token}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || t('cancelOrderFailed'));
        return;
      }
      setShowCancelModal(false);
      showToast(t('orderCancelledToast'), 'success');
      router.push('/my-orders');
    } catch {
      setCancelError(t('networkError'));
    } finally {
      setCancelling(false);
    }
  };

  const isCancellable =
    order?.status === 'received' || order?.status === 'eta_assigned';

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-fog flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-slate">{t('loadingOrder')}</p>
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
            {t('orderNotFound')}
          </h1>
          <p className="text-brand-slate mb-8">
            {error || t('orderNotFoundMessage')}
          </p>
          <Link href="/my-orders" className="btn-primary inline-flex px-6 py-3">
            <ChevronLeft className="w-5 h-5" />
            {t('goBack')}
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
      <div id="page-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal font-medium text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('backToHome')}
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-brand-slate hover:text-brand-charcoal rounded-xl hover:bg-white transition-all disabled:opacity-50 text-sm font-medium"
            title={t('refreshOrderStatusTitle')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? t('refreshing') : t('refresh')}
          </button>
        </div>

        {/* Payment pending banner — only for Razorpay orders still in 'received' state without payment */}
        {order.paymentMethod === 'razorpay' && order.paymentStatus !== 'captured' && order.status !== 'cancelled' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 text-sm">{t('paymentNotConfirmed')}</p>
              <p className="text-yellow-700 text-sm mt-0.5">
                {t('paymentNotConfirmedMessage')}
              </p>
            </div>
          </div>
        )}

        {/* Order Status Card */}
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-brand-charcoal break-all">{t('orderNumber', { token: order.statusToken.toUpperCase() })}</h1>
              <p className="text-brand-slate mt-1 text-sm">
                {t('placedOn', { date: formatDate(order.createdAt), time: formatTime(order.createdAt) })}
              </p>
              {lastUpdated && (
                <p className="text-xs text-brand-steel mt-1">
                  {t('lastUpdated', { time: formatTime(lastUpdated.toISOString()) })}
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
              {order.status === 'cancelled' && order.paymentMethod === 'razorpay' && !order.paymentStatus
                ? t('paymentNotCompletedNoCharge')
                : ORDER_STATUS_DESCRIPTIONS[order.status]}
            </p>
            {order.eta &&
              order.status !== "delivered" &&
              order.status !== "cancelled" && (
                <div className="mt-3 flex items-center gap-2 text-brand-primary font-semibold text-sm">
                  <Clock className="w-4 h-4" />
                  {t('estimatedDeliveryPrefix', { eta: order.eta })}
                </div>
              )}
            {order.status === "delivered" && (
              <p className="mt-3 text-green-700 font-semibold text-sm">
                {t('deliveryCompletedSuccessfully')}
              </p>
            )}
            {order.status === "cancelled" && (
              <p className="mt-3 text-red-700 font-semibold text-sm">
                {order.paymentMethod === 'razorpay' && !order.paymentStatus
                  ? t('paymentNotCompletedOrderNotPlaced')
                  : t('statusDescriptions.cancelled')}
              </p>
            )}
          </div>
        </div>

        {/* Order Progress Timeline */}
        {!isOrderCancelled && (
          <div className="card p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold text-brand-charcoal mb-6">
              {t('orderTimeline')}
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
                {t('deliveryAddress')}
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
                        {t('landmarkPrefix', { landmark: order.landmark })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-2 border-t border-neutral-100">
                  <Clock className="w-5 h-5 text-brand-steel mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-brand-charcoal font-medium">
                      {order.deliveryType === "urgent" ? t('urgentDelivery') : t('scheduledDelivery')}
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
                {t('orderItemsCount', { count: order.items.length })}
              </h2>
              <div className="space-y-1">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                  >
                    <div className="flex-grow">
                      <h3 className="font-medium text-brand-charcoal text-sm">{item.name}</h3>
                      <p className="text-xs text-brand-steel">{t('skuPrefix', { sku: item.sku })}</p>
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
            <div className="card p-6 top-20">
              <h2 className="text-lg font-bold text-brand-charcoal mb-4">
                {t('paymentDetails')}
              </h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-brand-slate">
                  <span>{t('subtotal')}</span>
                  <span className="font-medium text-brand-charcoal">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>{t('firstOrderDiscount')}</span>
                    <span className="font-medium">−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-100 pt-3 flex justify-between">
                  <span className="font-bold text-brand-charcoal">{t('totalAmount')}</span>
                  <span className="text-xl font-black text-brand-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
              <div className="bg-brand-fog rounded-xl p-3 text-sm border border-neutral-100">
                <p className="text-brand-slate">
                  <span className="font-semibold text-brand-charcoal">{t('paymentMethodLabel')}</span>
                </p>
                <p className="text-brand-charcoal font-medium mt-1">
                  {order.paymentMethod === 'razorpay' ? t('paymentMethodOnline') : t('paymentMethodCod')}
                </p>
                {order.paymentMethod === 'razorpay' && (
                  <p className={`text-xs font-semibold mt-2 ${order.paymentStatus === 'captured' ? 'text-green-700' : 'text-yellow-700'}`}>
                    {order.paymentStatus === 'captured' ? t('paymentConfirmed') : t('awaitingPayment')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="card p-6">
              <h3 className="font-bold text-brand-charcoal mb-3">{t('quickActions')}</h3>
              <div className="space-y-2">
                <button
                  onClick={handleCopyToken}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? t('copied') : t('copyOrderToken')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rnWebView = typeof window !== 'undefined' && (window as any).ReactNativeWebView;
                    if (rnWebView && typeof rnWebView.postMessage === 'function') {
                      // In WebView: trigger direct PDF download via the invoice API
                      const pdfUrl = `${window.location.origin}/api/invoice/${order.statusToken}`;
                      rnWebView.postMessage(JSON.stringify({ type: 'DOWNLOAD_PDF', url: pdfUrl }));
                    } else {
                      window.print();
                    }
                  }}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  <Download className="w-4 h-4" />
                  {t('printReceipt')}
                </button>
                {isCancellable && (
                  <button
                    onClick={() => { setCancelError(null); setShowCancelModal(true); }}
                    className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('cancelOrder')}
                  </button>
                )}
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-primary-50 rounded-2xl border border-primary-200 p-6">
              <h3 className="font-bold text-brand-charcoal mb-2">{t('needHelp')}</h3>
              <p className="text-sm text-brand-slate mb-4">
                {t('needHelpMessage')}
              </p>
              <a
                href="tel:+918847777020"
                className="btn-primary w-full py-2.5 text-sm"
              >
                <Phone className="w-4 h-4" />
                {t('callSupport')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print Invoice (hidden on screen, shown only when printing) ── */}
      <div id="print-invoice">

        {/* Dark header band */}
        <div className="inv-header">
          <div className="inv-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fastget-logo-clear.png" alt="FastGet" style={{ height: '30px', width: 'auto', display: 'block' }} />
              <p className="inv-company-name">FastGet</p>
            </div>
            <p className="inv-company-sub">
              {t('invoiceTagline')} &nbsp;|&nbsp; fastget.in
            </p>
          </div>
          <div className="inv-invoice-badge"><em>{t('invoiceLabel')}</em></div>
        </div>

        {/* Yellow tab accent below badge */}
        <div className="inv-tab-accent" />

        {/* Bill To + Invoice meta */}
        <div className="inv-info-row">
          <div className="inv-bill-to">
            <p className="inv-info-label">{t('billTo')}</p>
            <p className="inv-party-name">{order.customerName}</p>
            <p className="inv-party-line">{order.siteAddress}</p>
            {order.landmark && (
              <p className="inv-party-line">{t('landmarkPrefix', { landmark: order.landmark })}</p>
            )}
            <p className="inv-party-line">{order.customerPhone}</p>
          </div>
          <div className="inv-meta-block">
            <p className="inv-meta-num">#{order.statusToken.toUpperCase()}</p>
            <div className="inv-meta-row">
              <span className="inv-meta-key">{t('issueDate')}</span>
              <span className="inv-meta-val">{formatDate(order.createdAt)}</span>
            </div>
            {order.eta ? (
              <div className="inv-meta-row">
                <span className="inv-meta-key">{t('etaLabel')}</span>
                <span className="inv-meta-val">{order.eta}</span>
              </div>
            ) : order.scheduledTime ? (
              <div className="inv-meta-row">
                <span className="inv-meta-key">{t('scheduledLabel')}</span>
                <span className="inv-meta-val">{formatDate(order.scheduledTime)}</span>
              </div>
            ) : null}
            <hr className="inv-meta-divider" />
            <div className="inv-meta-row inv-meta-total">
              <span className="inv-meta-key">{t('totalAmountDue')}</span>
              <span className="inv-meta-val">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <hr className="inv-divider" />

        <p className="inv-intro">
          {t('invoiceIntro', { date: formatDate(order.createdAt), time: formatTime(order.createdAt) })}
        </p>

        {/* Items table */}
        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>{t('itemHeader')}</th>
              <th style={{ width: "12%", textAlign: "center" }}>{t('quantityHeader')}</th>
              <th style={{ width: "22%", textAlign: "right" }}>{t('pricePerUnitHeader')}</th>
              <th style={{ width: "21%", textAlign: "right" }}>{t('costHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className="inv-item-name">{item.name}</div>
                  <div className="inv-item-sku">{item.sku}</div>
                </td>
                <td style={{ textAlign: "center" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(item.price)}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Payment methods (left) + Totals (right) */}
        <div className="inv-bottom-row">
          <div className="inv-payment-block">
            <p className="inv-payment-title">{t('ourPaymentMethods')}</p>
            {order.paymentMethod === "razorpay" ? (
              <>
                <p className="inv-payment-line">{t('paymentMethodOnline')}</p>
                <p className="inv-payment-line">
                  {t('invoiceStatusLabel')}{" "}
                  {order.paymentStatus === "captured" ? t('invoiceStatusConfirmed') : t('invoiceStatusPending')}
                </p>
              </>
            ) : (
              <p className="inv-payment-line">{t('codPayAtSite')}</p>
            )}
          </div>
          <div className="inv-totals-block">
            <div className="inv-totals-row">
              <span className="inv-totals-label">{t('subTotal')}</span>
              <span className="inv-totals-value">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="inv-totals-row">
                <span className="inv-totals-label">{t('firstOrderDiscount')}</span>
                <span className="inv-totals-value">−{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="inv-totals-row inv-totals-grand">
              <span className="inv-totals-label">{t('totalDue')}</span>
              <span className="inv-totals-value">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="inv-footer">
          <p>https://fastget.in &nbsp;//&nbsp; Page 1</p>
        </div> */}

      </div>
      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-brand-charcoal">{t('cancelModalTitle')}</h2>
            </div>

            <p className="text-brand-slate text-sm mb-3">
              {t('cancelModalMessage', { token: order.statusToken.toUpperCase() })}
            </p>

            {order.paymentMethod === 'razorpay' && order.paymentStatus === 'captured' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                <p className="text-yellow-800 text-sm font-medium">{t('refundNoticeTitle')}</p>
                <p className="text-yellow-700 text-sm mt-0.5">
                  {t('refundNoticeMessage', { amount: formatCurrency(order.total) })}
                </p>
              </div>
            )}

            {cancelError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-700 text-sm">{cancelError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-brand-charcoal font-semibold text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {t('keepOrder')}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('cancelling')}
                  </>
                ) : (
                  t('confirmCancelOrder')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
