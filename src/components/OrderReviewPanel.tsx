'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastContext';
import { StarRating } from '@/components/StarRating';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { isWithinReviewEditWindow, REVIEW_EDIT_WINDOW_MINUTES } from '@/lib/reviewPolicy';
import { Loader2, Star, Lock } from 'lucide-react';

interface ReviewValue {
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ItemReview {
  sku: string;
  name: string;
  review: ReviewValue | null;
}

interface ReviewData {
  canReview: boolean;
  items: ItemReview[];
  feedback: ReviewValue | null;
}

function LockedNote() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-brand-steel">
      <Lock className="w-3.5 h-3.5" />
      Locked after {REVIEW_EDIT_WINDOW_MINUTES} min
    </span>
  );
}

function ItemRow({ orderId, item, onSaved, onDeleted }: {
  orderId: string;
  item: ItemReview;
  onSaved: (sku: string, review: ReviewValue) => void;
  onDeleted: (sku: string) => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(item.review?.rating ?? 5);
  const [comment, setComment] = useState(item.review?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const locked = item.review !== null && !isWithinReviewEditWindow(item.review.createdAt);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productCode: item.sku, rating, comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save review');
      showToast('Review saved', 'success');
      onSaved(item.sku, { rating: json.data.rating, comment: json.data.comment, createdAt: json.data.createdAt });
      setEditing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save review', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productCode: item.sku }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete review');
      showToast('Review deleted', 'success');
      onDeleted(item.sku);
      setRating(5);
      setComment('');
      setConfirmingDelete(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete review', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
        <div>
          <p className="text-sm font-medium text-brand-charcoal">{item.name}</p>
          {item.review && <StarRating value={item.review.rating} readOnly size={13} />}
        </div>
        <div className="flex items-center gap-3">
          {locked ? (
            <LockedNote />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-brand-primary hover:text-brand-dark"
            >
              {item.review ? 'Edit Review' : 'Rate Product'}
            </button>
          )}
          {item.review && (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>

        {confirmingDelete && (
          <ConfirmDeleteModal
            title="Delete review?"
            message={`Your review for "${item.name}" will be permanently removed.`}
            pending={deleting}
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={remove}
          />
        )}
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-neutral-100 last:border-0 space-y-2.5">
      <p className="text-sm font-medium text-brand-charcoal">{item.name}</p>
      <StarRating value={rating} onChange={setRating} size={22} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Optional comment"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs font-medium text-brand-slate hover:text-brand-charcoal">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Expandable delivery-feedback + per-item review panel for a delivered order. */
export function OrderReviewPanel({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewData | null>(null);

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [confirmingFeedbackDelete, setConfirmingFeedbackDelete] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    fetch(`/api/reviews/order/${orderId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          if (json.data.feedback) {
            setFeedbackRating(json.data.feedback.rating);
            setFeedbackComment(json.data.feedback.comment ?? '');
          }
        }
      })
      .catch(() => showToast('Could not load review status', 'error'))
      .finally(() => setLoading(false));
  }, [open, data, orderId, showToast]);

  const saveFeedback = async () => {
    setSavingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating: feedbackRating, comment: feedbackComment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save feedback');
      showToast('Thanks for your feedback!', 'success');
      setData((prev) =>
        prev
          ? { ...prev, feedback: { rating: json.data.rating, comment: json.data.comment, createdAt: json.data.createdAt } }
          : prev
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save feedback', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const deleteFeedback = async () => {
    setDeletingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete feedback');
      showToast('Feedback deleted', 'success');
      setData((prev) => (prev ? { ...prev, feedback: null } : prev));
      setFeedbackRating(5);
      setFeedbackComment('');
      setConfirmingFeedbackDelete(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete feedback', 'error');
    } finally {
      setDeletingFeedback(false);
    }
  };

  const feedbackLocked = data?.feedback !== null && data?.feedback !== undefined && !isWithinReviewEditWindow(data.feedback.createdAt);

  return (
    <div className="border-t border-neutral-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-primary-50 transition-colors"
      >
        <Star className="w-4 h-4" />
        {open ? 'Hide Rating & Review' : 'Rate & Review'}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {loading || !data ? (
            <div className="flex items-center gap-2 text-sm text-brand-slate py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-brand-graphite uppercase tracking-wide">
                    Delivery Experience
                  </h4>
                  {feedbackLocked && <LockedNote />}
                </div>
                <StarRating value={feedbackRating} onChange={feedbackLocked ? undefined : setFeedbackRating} size={24} />
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  disabled={feedbackLocked}
                  placeholder="How was your delivery? (optional)"
                  className="w-full mt-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-primary disabled:bg-neutral-50 disabled:text-brand-steel"
                />
                <div className="flex items-center gap-4 mt-2">
                  {!feedbackLocked && (
                    <button
                      onClick={saveFeedback}
                      disabled={savingFeedback}
                      className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-60"
                    >
                      {savingFeedback ? 'Saving…' : data.feedback ? 'Update Feedback' : 'Submit Feedback'}
                    </button>
                  )}
                  {data.feedback && (
                    <button
                      onClick={() => setConfirmingFeedbackDelete(true)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Delete Feedback
                    </button>
                  )}
                </div>
              </div>

              {data.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-brand-graphite uppercase tracking-wide mb-1">
                    Rate Products
                  </h4>
                  {data.items.map((item) => (
                    <ItemRow
                      key={item.sku}
                      orderId={orderId}
                      item={item}
                      onSaved={(sku, review) =>
                        setData((prev) =>
                          prev
                            ? { ...prev, items: prev.items.map((i) => (i.sku === sku ? { ...i, review } : i)) }
                            : prev
                        )
                      }
                      onDeleted={(sku) =>
                        setData((prev) =>
                          prev
                            ? { ...prev, items: prev.items.map((i) => (i.sku === sku ? { ...i, review: null } : i)) }
                            : prev
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {confirmingFeedbackDelete && (
        <ConfirmDeleteModal
          title="Delete feedback?"
          message="Your delivery feedback for this order will be permanently removed."
          pending={deletingFeedback}
          onCancel={() => setConfirmingFeedbackDelete(false)}
          onConfirm={deleteFeedback}
        />
      )}
    </div>
  );
}
