'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MarkReferralPaidButtonProps {
  orderId: string;
  amount: number;
}

/**
 * "Mark ₹X paid" for a delivered referred order. Takes an optional UPI /
 * transaction reference, then refreshes the server-rendered page.
 */
export function MarkReferralPaidButton({ orderId, amount }: MarkReferralPaidButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payoutRef, setPayoutRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/admin/api/referrals/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutRef }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to mark as paid');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Failed to mark as paid');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-bold whitespace-nowrap transition-colors"
      >
        Mark ₹{amount} paid
      </button>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[200px]">
      <input
        type="text"
        value={payoutRef}
        onChange={(e) => setPayoutRef(e.target.value)}
        placeholder="UPI / txn ref (optional)"
        maxLength={100}
        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : `Confirm ₹${amount} paid`}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-brand-slate hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
