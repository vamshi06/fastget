import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export const metadata = { title: 'Refund Policy — FastGet' };

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund Policy" updatedAt="16 June 2026">
      <LegalSection heading="1. Order cancellations">
        <p>
          Because FastGet delivers urgently within 30–60 minutes, orders can typically only be
          cancelled for a full refund before they are dispatched for delivery. Once an order is out
          for delivery, it can no longer be cancelled.
        </p>
      </LegalSection>

      <LegalSection heading="2. Damaged, defective, or wrong items">
        <p>
          If you receive damaged, defective, or incorrect items, contact us within 24 hours of
          delivery at <a href="mailto:support@elemantra.in" className="text-brand-primary font-medium">support@elemantra.in</a>
          {' '}with your order number and photos of the issue. We will arrange a replacement or a
          full refund for the affected items.
        </p>
      </LegalSection>

      <LegalSection heading="3. Non-returnable items">
        <p>Due to the nature of building materials (cut-to-size items, custom orders, and bulk/loose materials), items that are not defective and have been delivered correctly are not eligible for return once accepted.</p>
      </LegalSection>

      <LegalSection heading="4. Refund method and timeline">
        <p>
          Approved refunds are issued to your original payment method via Razorpay. Refunds
          typically reflect in your account within 5–7 business days, depending on your bank or
          payment provider.
        </p>
      </LegalSection>

      <LegalSection heading="5. How to request a refund">
        <p>
          Email <a href="mailto:support@elemantra.in" className="text-brand-primary font-medium">support@elemantra.in</a>
          {' '}or visit the Support page in the app with your order number and a brief description
          of the issue.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
