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
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      router.push('/admin/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary px-4 py-2 text-sm text-red-600 hover:text-red-700"
      >
        Delete Order
      </button>

      {error && <p className="text-xs text-red-600 mt-2 text-right">{error}</p>}

      {open && (
        <ConfirmDeleteModal
          title="Delete order?"
          message="This will permanently remove the order along with any associated reviews and delivery feedback. This cannot be undone."
          pending={deleting}
          onCancel={() => setOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
