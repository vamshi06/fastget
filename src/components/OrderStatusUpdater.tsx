'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle, Loader } from 'lucide-react';
import { OrderStatus, ORDER_STATUS_LABELS, VALID_STATUS_TRANSITIONS } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface OrderStatusUpdaterProps {
  orderId: string;
  status: OrderStatus;
  customerName: string;
  /** Amount captured online (Razorpay). Cancelling then needs a manual refund. */
  paidOnlineAmount?: number;
  onUpdated: (newStatus: OrderStatus, eta?: string) => void;
}

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  eta_assigned: 'Assign ETA',
  out_for_delivery: 'Mark Out for Delivery',
  delivered: 'Mark Delivered',
  cancelled: 'Cancel Order',
};

const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl bg-brand-fog text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all duration-200';

/**
 * "Update order status" card shared by the admin order page and the agent
 * panel: pick the next valid status, optionally an ETA, confirm, then POST to
 * /api/orders/update. Cancelling an order paid online warns that the money
 * must be refunded from the Razorpay dashboard - it is not refunded automatically.
 */
export function OrderStatusUpdater({ orderId, status, customerName, paidOnlineAmount, onUpdated }: OrderStatusUpdaterProps) {
  const [selected, setSelected] = useState<OrderStatus | ''>('');
  const [eta, setEta] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const nextStatuses = VALID_STATUS_TRANSITIONS[status];
  const needsRefund = selected === 'cancelled' && !!paidOnlineAmount;

  if (nextStatuses.length === 0) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-brand-charcoal">Order {status === 'cancelled' ? 'cancelled' : 'complete'}</h3>
        <p className="text-brand-slate mt-1 text-sm">No further status changes are possible.</p>
        {result?.success && <p className="text-sm text-green-700 mt-2">{result.message}</p>}
      </div>
    );
  }

  const doUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    setResult(null);
    try {
      const response = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: selected, eta: eta.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        const updatedTo = selected;
        setResult({ success: true, message: `Order updated to "${ORDER_STATUS_LABELS[updatedTo]}".` });
        setSelected('');
        setEta('');
        setConfirmOpen(false);
        onUpdated(updatedTo, eta.trim() || undefined);
      } else {
        setResult({ success: false, message: data.error || 'Failed to update order status' });
        setConfirmOpen(false);
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-brand-charcoal">Update Order Status</h3>
      <p className="text-sm text-brand-slate mt-1 mb-5">
        Currently <strong>{ORDER_STATUS_LABELS[status]}</strong>. Next: {nextStatuses.map((s) => ORDER_STATUS_LABELS[s]).join(' or ')}.
      </p>

      {result && (
        <div className={`mb-5 p-4 rounded-xl flex items-start gap-3 ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {result.success
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>{result.message}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (selected) { setResult(null); setConfirmOpen(true); }
        }}
        className="space-y-4"
      >
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelected(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                selected === s
                  ? s === 'cancelled'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-brand-primary text-white border-brand-primary'
                  : s === 'cancelled'
                    ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                    : 'bg-white text-brand-charcoal border-neutral-200 hover:border-brand-primary hover:bg-primary-50'
              }`}
            >
              {ACTION_LABELS[s] ?? ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {selected === 'eta_assigned' && (
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
              maxLength={100}
            />
          </div>
        )}

        {needsRefund && (
          <RefundWarning amount={paidOnlineAmount!} />
        )}

        <button
          type="submit"
          disabled={saving || !selected}
          className="btn-primary w-full py-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader className="w-5 h-5 animate-spin" /> Updating...</>
          ) : (
            <>{selected ? (ACTION_LABELS[selected] ?? 'Update Status') : 'Select an action'} <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </form>

      {confirmOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && setConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="font-bold text-brand-charcoal">Confirm status change</h2>
              <p className="text-sm text-brand-slate mt-1">
                Change <span className="font-semibold text-brand-charcoal">{customerName}</span>&apos;s order from{' '}
                <strong>{ORDER_STATUS_LABELS[status]}</strong> to <strong>{ORDER_STATUS_LABELS[selected]}</strong>?
              </p>
            </div>
            {needsRefund && <RefundWarning amount={paidOnlineAmount!} />}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-brand-charcoal hover:bg-brand-fog transition-colors disabled:opacity-50"
              >
                Go back
              </button>
              <button
                onClick={doUpdate}
                disabled={saving}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  selected === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-dark'
                }`}
              >
                {saving ? 'Updating…' : selected === 'cancelled' ? 'Yes, cancel order' : 'Yes, update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefundWarning({ amount }: { amount: number }) {
  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900">
        This order was <strong>paid online ({formatCurrency(amount)})</strong>. Cancelling does not refund it
        automatically - refund it from the Razorpay dashboard after cancelling.
      </p>
    </div>
  );
}
