'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ToastContext';
import { StarRating } from '@/components/StarRating';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { isWithinReviewEditWindow, REVIEW_EDIT_WINDOW_MINUTES } from '@/lib/reviewPolicy';
import { MessageSquareText, Loader2, Lock } from 'lucide-react';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface EligibilityData {
  canReview: boolean;
  orderId: string | null;
  existingReview: Review | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProductReviews({ productCode }: { productCode: string }) {
  const { currentUser, isLoaded } = useUser();
  const { showToast } = useToast();
  const t = useTranslations('product');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadReviews = useCallback(() => {
    setLoading(true);
    fetch(`/api/reviews?productCode=${encodeURIComponent(productCode)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setReviews(json.data.reviews);
          setAverage(json.data.average);
          setCount(json.data.count);
        }
      })
      .catch(() => {/* ignore — reviews are non-critical */})
      .finally(() => setLoading(false));
  }, [productCode]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  useEffect(() => {
    if (!isLoaded || !currentUser) { setEligibility(null); return; }
    fetch(`/api/reviews/eligibility?productCode=${encodeURIComponent(productCode)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setEligibility(json.data);
          if (json.data.existingReview) {
            setRating(json.data.existingReview.rating);
            setComment(json.data.existingReview.comment ?? '');
          }
        }
      })
      .catch(() => {/* ignore — write-review CTA just won't show */});
  }, [isLoaded, currentUser, productCode]);

  const handleSubmit = async () => {
    if (!eligibility?.orderId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: eligibility.orderId, productCode, rating, comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t('failedToSubmitReview'));
      showToast(t('thanksForReview'), 'success');
      setShowForm(false);
      setEligibility((prev) => (prev ? { ...prev, existingReview: json.data } : prev));
      loadReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('couldNotSubmitReview'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eligibility?.orderId) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: eligibility.orderId, productCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t('failedToDeleteReview'));
      showToast(t('reviewDeleted'), 'success');
      setEligibility((prev) => (prev ? { ...prev, existingReview: null } : prev));
      setRating(5);
      setComment('');
      setConfirmingDelete(false);
      loadReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('couldNotDeleteReview'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-t border-neutral-100 pt-8 mt-4">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-brand-charcoal">{t('ratingsAndReviews')}</h2>
          {count > 0 ? (
            <div className="flex items-center gap-2 mt-1.5">
              <StarRating value={Math.round(average)} readOnly size={16} />
              <span className="text-sm text-brand-slate">
                {t('reviewSummary', { average: average.toFixed(1), count })}
              </span>
            </div>
          ) : (
            <p className="text-sm text-brand-slate mt-1">{t('noReviewsYet')}</p>
          )}
        </div>

        {isLoaded && currentUser && eligibility?.canReview && !showForm && (
          <div className="flex items-center gap-3">
            {eligibility.existingReview && !isWithinReviewEditWindow(eligibility.existingReview.createdAt) ? (
              <span className="flex items-center gap-1.5 text-xs text-brand-steel">
                <Lock className="w-3.5 h-3.5" />
                {t('reviewLockedAfter', { minutes: REVIEW_EDIT_WINDOW_MINUTES })}
              </span>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-dark transition-colors"
              >
                {eligibility.existingReview ? t('editReview') : t('writeReview')}
              </button>
            )}
            {eligibility.existingReview && (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                {t('delete')}
              </button>
            )}
          </div>
        )}

        {isLoaded && !currentUser && (
          <Link
            href="/login"
            className="text-sm font-medium text-brand-primary hover:text-brand-dark"
          >
            {t('loginToReview')}
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-brand-fog rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-2 uppercase tracking-wide">
              {t('yourRating')}
            </label>
            <StarRating value={rating} onChange={setRating} size={28} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-2 uppercase tracking-wide">
              {t('yourReviewOptional')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t('reviewPlaceholder')}
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-brand-charcoal focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('submitReview')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-brand-slate hover:text-brand-charcoal"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-brand-slate py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('loadingReviews')}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex items-center gap-3 text-sm text-brand-slate bg-brand-fog rounded-2xl px-5 py-6">
          <MessageSquareText className="w-5 h-5 text-brand-steel flex-shrink-0" />
          {t('beFirstToReview')}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-neutral-100 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-brand-charcoal">{r.userName}</span>
                <span className="text-xs text-brand-steel">{formatDate(r.createdAt)}</span>
              </div>
              <StarRating value={r.rating} readOnly size={14} />
              {r.comment && (
                <p className="text-sm text-brand-slate mt-2 leading-relaxed">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteModal
          title={t('deleteReviewTitle')}
          message={t('deleteReviewMessage')}
          pending={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
