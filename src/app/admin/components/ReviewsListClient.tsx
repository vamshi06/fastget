'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StarRating } from '@/components/StarRating';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import type { ProductReview, OrderFeedback } from '@/lib/db';

interface ReviewsListProps {
  reviews: ProductReview[];
  feedback: (OrderFeedback & { userName: string })[];
}

type PendingDelete = { type: 'review' | 'feedback'; id: string } | null;

const RATING_FILTERS = [
  { key: 'all', label: 'All ratings' },
  { key: 'low', label: '1-2★ (needs attention)' },
  { key: '5', label: '5★' },
  { key: '4', label: '4★' },
  { key: '3', label: '3★' },
  { key: '2', label: '2★' },
  { key: '1', label: '1★' },
] as const;

type RatingFilter = (typeof RATING_FILTERS)[number]['key'];

function matchesRating(rating: number, filter: RatingFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'low') return rating <= 2;
  return rating === Number(filter);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

const thCls = 'px-6 py-3 text-left text-xs font-semibold text-brand-steel uppercase tracking-wide';

export function ReviewsListClient({ reviews: initialReviews, feedback: initialFeedback }: ReviewsListProps) {
  const [tab, setTab] = useState<'reviews' | 'feedback'>('reviews');
  const [reviews, setReviews] = useState(initialReviews);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const url = pendingDelete.type === 'review'
        ? `/admin/api/reviews/product/${pendingDelete.id}`
        : `/admin/api/reviews/feedback/${pendingDelete.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      if (pendingDelete.type === 'review') {
        setReviews((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      } else {
        setFeedback((prev) => prev.filter((f) => f.id !== pendingDelete.id));
      }
    } catch (err) {
      setError(`Couldn't delete: ${err instanceof Error ? err.message : 'please try again.'}`);
    } finally {
      setPendingDelete(null);
      setDeleting(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visibleReviews = reviews.filter((r) =>
    matchesRating(r.rating, ratingFilter) &&
    (!term || [r.productName, r.userName, r.comment ?? ''].some((v) => v.toLowerCase().includes(term))),
  );
  const visibleFeedback = feedback.filter((f) =>
    matchesRating(f.rating, ratingFilter) &&
    (!term || [f.userName, f.comment ?? '', f.orderId].some((v) => v.toLowerCase().includes(term))),
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pr-4">
          <div className="flex">
            {(['reviews', 'feedback'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 sm:px-6 py-3.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'text-brand-primary border-b-2 border-brand-primary'
                    : 'text-brand-steel hover:text-brand-charcoal'
                }`}
              >
                {t === 'reviews' ? `Product Reviews (${reviews.length})` : `Delivery Feedback (${feedback.length})`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 py-2 pl-4 sm:pl-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text, product, customer"
              className="px-3 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
            />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
              className="px-3 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary"
            >
              {RATING_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {tab === 'reviews' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-brand-fog border-b border-neutral-100">
                  <th className={thCls}>Product</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Rating</th>
                  <th className={thCls}>Comment</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleReviews.length > 0 ? (
                  visibleReviews.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 hover:bg-primary-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        <Link href={`/product/${r.productCode}`} target="_blank" className="text-brand-charcoal hover:text-brand-primary">
                          {r.productName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-slate">
                        {r.userName}
                        <Link href={`/admin/orders/${r.orderId}`} className="block text-xs text-brand-primary hover:underline">
                          Order {r.orderId.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-6 py-4"><StarRating value={r.rating} readOnly size={14} /></td>
                      <td className="px-6 py-4 text-sm text-brand-slate max-w-sm">{r.comment || '-'}</td>
                      <td className="px-6 py-4 text-sm text-brand-slate whitespace-nowrap">{formatDate(r.createdAt)}</td>
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
                      {reviews.length === 0 ? 'No product reviews yet' : 'No reviews match these filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-brand-fog border-b border-neutral-100">
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Rating</th>
                  <th className={thCls}>Comment</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleFeedback.length > 0 ? (
                  visibleFeedback.map((f) => (
                    <tr key={f.id} className="border-b border-neutral-100 hover:bg-primary-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono font-semibold">
                        <Link href={`/admin/orders/${f.orderId}`} className="text-brand-primary hover:underline">
                          {f.orderId.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-slate">{f.userName}</td>
                      <td className="px-6 py-4"><StarRating value={f.rating} readOnly size={14} /></td>
                      <td className="px-6 py-4 text-sm text-brand-slate max-w-sm">{f.comment || '-'}</td>
                      <td className="px-6 py-4 text-sm text-brand-slate whitespace-nowrap">{formatDate(f.createdAt)}</td>
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
                      {feedback.length === 0 ? 'No delivery feedback yet' : 'No feedback matches these filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
