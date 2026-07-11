import { getAllProductReviewsForAdmin, getAllOrderFeedbackForAdmin } from '@/lib/db';
import { requireAdminPage } from '@/lib/auth';
import { ReviewsListClient } from '../components/ReviewsListClient';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireAdminPage();
  const [reviews, feedback] = await Promise.all([
    getAllProductReviewsForAdmin(),
    getAllOrderFeedbackForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Reviews & Feedback</h1>
        <p className="text-brand-slate text-sm">
          {reviews.length} product review{reviews.length !== 1 ? 's' : ''} · {feedback.length} delivery rating{feedback.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ReviewsListClient reviews={reviews} feedback={feedback} />
    </div>
  );
}
