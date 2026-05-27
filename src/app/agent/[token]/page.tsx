'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderStatus, ORDER_STATUS_LABELS, VALID_STATUS_TRANSITIONS } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Lock,
  ArrowRight,
  Loader,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function AgentUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params.token as string).toLowerCase();

  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [pin, setPin] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/agent-token/${token}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Order not found');
        const data = await response.json();
        setOrder(data);
        setSelectedStatus('');
        setEta('');
        setPin('');
        setResult(null);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setLoadingOrder(false);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [token]);

  const validNextStatuses = order ? VALID_STATUS_TRANSITIONS[order.status] : [];

  const getButtonText = () => {
    if (!selectedStatus) return 'Select an action';
    switch (selectedStatus) {
      case 'eta_assigned': return 'Assign ETA';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Mark Delivered';
      case 'cancelled': return 'Cancel Order';
      default: return 'Update Status';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || !pin) return;

    if (selectedStatus === order?.status) {
      setResult({ success: false, message: 'Cannot transition to the same status. Please select a different action.' });
      setSelectedStatus('');
      return;
    }

    const validTransitions = VALID_STATUS_TRANSITIONS[order?.status || 'received'];
    if (!validTransitions.includes(selectedStatus)) {
      setResult({
        success: false,
        message: `Cannot transition from ${order?.status} to ${selectedStatus}.`,
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateToken: token, status: selectedStatus, pin, eta: eta || undefined }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({ success: true, message: `Order updated to "${ORDER_STATUS_LABELS[selectedStatus]}" successfully!` });
        setPin('');
        setSelectedStatus('');
        setEta('');

        if (data.order) {
          setOrder(prevOrder => prevOrder ? {
            ...prevOrder,
            status: data.order.status as OrderStatus,
            eta: data.order.eta || prevOrder.eta,
          } : null);
        }

        setTimeout(() => { router.push('/agent-dashboard'); }, 1500);
      } else {
        setResult({ success: false, message: data.error || 'Failed to update order status' });
      }
    } catch {
      setResult({ success: false, message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl bg-brand-fog text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all duration-200';

  const statusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, string> = {
      received: 'bg-amber-100 text-amber-800',
      eta_assigned: 'bg-primary-100 text-primary-700',
      out_for_delivery: 'bg-neutral-100 text-brand-graphite',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-neutral-100 text-brand-slate';
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen bg-brand-fog py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-brand-primary mx-auto mb-4" />
              <p className="text-brand-slate">Loading order details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-fog py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal mb-4 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
            <h2 className="text-lg font-bold text-red-900">Order Not Found</h2>
            <p className="text-red-800 mt-1 text-sm">The order could not be found. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const isComplete = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/agent-dashboard" className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-charcoal text-sm font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Order Summary Card */}
          <div className="card p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-brand-charcoal">{order.customerName}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="space-y-2 text-brand-charcoal text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-steel" />
                  <span>{order.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-steel mt-0.5" />
                  <div>
                    <div>{order.siteAddress}</div>
                    {order.landmark && <div className="text-xs text-brand-slate">Landmark: {order.landmark}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-t border-neutral-100">
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Order Date</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">{formatDate(order.createdAt)}</p>
                <p className="text-xs text-brand-slate">{formatTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Amount</p>
                <p className="text-lg font-black text-brand-primary mt-1">{formatCurrency(order.total)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-steel uppercase tracking-wide">Items</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">{order.items.length}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs font-semibold text-brand-graphite uppercase tracking-wide mb-2">Order Items</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-brand-charcoal">
                    <span>{item.quantity}× {item.name}</span>
                    <span className="text-brand-slate">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.eta && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span className="text-brand-slate">ETA: <strong className="text-brand-charcoal">{order.eta}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Update Form */}
          {!isComplete ? (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-brand-charcoal">Update Order Status</h3>
                <p className="text-sm text-brand-slate mt-1">
                  {validNextStatuses.filter(s => s !== order?.status).length === 0
                    ? 'No actions available for this order'
                    : `Available: ${validNextStatuses.filter(s => s !== order?.status).map(s => ORDER_STATUS_LABELS[s]).join(', ')}`}
                </p>
              </div>

              {result && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {result.success
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                  <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                    Next Action
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as OrderStatus;
                      if (!newStatus) { setSelectedStatus(''); return; }
                      if (newStatus === order?.status) {
                        setResult({ success: false, message: 'Cannot select the current status.' });
                        return;
                      }
                      if (!VALID_STATUS_TRANSITIONS[order?.status || 'received'].includes(newStatus)) {
                        setResult({ success: false, message: `Cannot transition from ${order?.status} to ${newStatus}` });
                        return;
                      }
                      setSelectedStatus(newStatus);
                    }}
                    className={inputCls}
                    required
                  >
                    <option value="">Select an action...</option>
                    {order && VALID_STATUS_TRANSITIONS[order.status]
                      .filter(s => s !== order.status)
                      .map((status) => (
                        <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
                      ))}
                  </select>
                  {selectedStatus && (
                    <p className="text-xs text-brand-steel mt-1">
                      Moving from <strong>{ORDER_STATUS_LABELS[order?.status || 'received']}</strong> to <strong>{ORDER_STATUS_LABELS[selectedStatus]}</strong>
                    </p>
                  )}
                </div>

                {selectedStatus === 'eta_assigned' && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                      Estimated Delivery Time
                    </label>
                    <input
                      type="text"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                      className={inputCls}
                      placeholder="e.g., 2:30 PM - 3:00 PM"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                    4-Digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={`${inputCls} pl-10`}
                      placeholder="Enter PIN"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedStatus ||
                    pin.length !== 4 ||
                    selectedStatus === order?.status ||
                    !VALID_STATUS_TRANSITIONS[order?.status || 'received'].includes(selectedStatus)
                  }
                  className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      {getButtonText()}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-brand-charcoal">Order Complete</h3>
              <p className="text-brand-slate mt-2 text-sm">No further actions needed for this order.</p>
              <Link href="/agent-dashboard" className="btn-primary inline-flex mt-4">
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
