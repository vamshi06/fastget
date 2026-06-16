import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export const metadata = { title: 'Shipping Policy — FastGet' };

export default function ShippingPolicyPage() {
  return (
    <LegalPageLayout title="Shipping Policy" updatedAt="16 June 2026">
      <LegalSection heading="1. Service area">
        <p>FastGet currently delivers to construction sites and businesses in Andheri, Goregaon, and Malad, Mumbai. We&apos;re working on expanding to more areas.</p>
      </LegalSection>

      <LegalSection heading="2. Delivery time">
        <p>
          Most orders are delivered within 30–60 minutes of confirmation, subject to traffic,
          order size, and stock availability. You can track your order&apos;s status from{' '}
          <strong>Account → Order History</strong>.
        </p>
      </LegalSection>

      <LegalSection heading="3. Delivery charges">
        <p>Delivery charges, if any, are shown at checkout before you complete payment.</p>
      </LegalSection>

      <LegalSection heading="4. Failed or delayed delivery">
        <p>If our delivery agent is unable to reach you or the delivery address, we will attempt to contact you using the phone number on your order. Significant delays will be communicated via email or in-app order status updates.</p>
      </LegalSection>

      <LegalSection heading="5. Questions">
        <p>
          Contact <a href="mailto:support@elemantra.in" className="text-brand-primary font-medium">support@elemantra.in</a> for any delivery questions.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
