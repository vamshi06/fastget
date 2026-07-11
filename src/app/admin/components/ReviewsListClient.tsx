'use client';

import { useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import type { ProductReview, OrderFeedback } from '@/lib/db';

interface ReviewsListProps {
  reviews: ProductReview[];
  feedback: (OrderFeedback & { userName: string })[];
}

type PendingDelete = { type: 'review' | 'feedback'; id: string } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ReviewsListClient({ reviews: initialReviews, feedback: initialFeedback }: ReviewsListProps) {
  const [tab, setTab] = useState<'reviews' | 'feedback'>('reviews');
  const [reviews, setReviews] = useState(initialReviews);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const url = pendingDelete.type === 'review'
        ? `/admin/api/reviews/product/${pendingDelete.id}`
        : `/admin/api/reviews/feedback/${pendingDelete.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      if (pendingDelete.type === 'review') {
        setReviews((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      } else {
        setFeedback((prev) => prev.filter((f) => f.id !== pendingDelete.id));
      }
      setPendingDelete(null);
    } catch {
      // best-effort admin action — row simply stays if the delete failed
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-neutral-100">
        {(['reviews', 'feedback'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-steel hover:text-brand-charcoal'
            }`}
          >
            {t === 'reviews' ? 'Product Reviews' : 'Delivery Feedback'}
          </button>
        ))}
      </div>

      {tab === 'reviews' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-fog border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Comment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length > 0 ? (
                reviews.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 hover:bg-primary-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-brand-charcoal">{r.productName}</td>
                    <td className="px-6 py-4 text-sm text-brand-slate">{r.userName}</td>
                    <td className="px-6 py-4"><StarRating value={r.rating} readOnly size={14} /></td>
                    <td className="px-6 py-4 text-sm text-brand-slate max-w-sm">{r.comment || '—'}</td>
                    <td className="px-6 py-4 text-sm text-brand-slate">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setPendingDelete({ type: 'review', id: r.id })}
                        className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-slate font-medium">
                    No product reviews yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-fog border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Comment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {feedback.length > 0 ? (
                feedback.map((f) => (
                  <tr key={f.id} className="border-b border-neutral-100 hover:bg-primary-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-brand-charcoal">{f.orderId.slice(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 text-sm text-brand-slate">{f.userName}</td>
                    <td className="px-6 py-4"><StarRating value={f.rating} readOnly size={14} /></td>
                    <td className="px-6 py-4 text-sm text-brand-slate max-w-sm">{f.comment || '—'}</td>
                    <td className="px-6 py-4 text-sm text-brand-slate">{formatDate(f.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setPendingDelete({ type: 'feedback', id: f.id })}
                        className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-slate font-medium">
                    No delivery feedback yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title={pendingDelete.type === 'review' ? 'Delete review?' : 'Delete feedback?'}
          message="This will be permanently removed and the customer will no longer see it."
          pending={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
