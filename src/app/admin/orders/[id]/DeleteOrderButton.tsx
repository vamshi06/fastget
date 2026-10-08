'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/admin/api/orders/${orderId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!json.success) throw new Error(json.error || 'Failed to delete order');
      router.push('/admin/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
      setOpen(false);
      setDeleting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete order permanently
      </button>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {open && (
        <ConfirmDeleteModal
          title="Delete order?"
          message="This permanently removes this cancelled order along with any associated reviews and delivery feedback. Coins the customer earned or redeemed on this order stay in their balance (adjust them from the Coins page if needed), and any referral record on it is removed. This cannot be undone."
          pending={deleting}
          onCancel={() => setOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
