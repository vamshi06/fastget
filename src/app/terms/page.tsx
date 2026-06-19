import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Terms of Service — FastGet" };

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" updatedAt="16 June 2026">
      <LegalSection heading="1. Acceptance of terms">
        <p>
          By creating an account or placing an order on FastGet (the
          &ldquo;Service&rdquo;), operated by Elemantra (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), you agree to these Terms of Service. If you do not
          agree, please do not use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Who can use FastGet">
        <p>
          FastGet is intended for contractors and businesses ordering building
          materials for delivery within our serviceable Mumbai locations
          (currently Andheri, Goregaon, and Malad). You must be at least 18
          years old and able to enter into a binding contract to create an
          account.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your account">
        <p>
          You are responsible for keeping your password confidential and for all
          activity under your account. Notify us immediately at{" "}
          <a
            href="mailto:support@elemantra.in"
            className="text-brand-primary font-medium"
          >
            support@elemantra.in
          </a>{" "}
          if you suspect unauthorized use.
        </p>
      </LegalSection>

      <LegalSection heading="4. Orders, pricing, and payment">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Product prices and availability are shown at the time of ordering
            and may change without notice.
          </li>
          <li>
            Payments are processed securely through Razorpay (cards, UPI, net
            banking). We do not store your card or UPI credentials.
          </li>
          <li>
            An order is confirmed only once payment is successfully authorized.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Delivery">
        <p>
          We aim to deliver within 30–60 minutes inside our serviceable areas,
          depending on order size, traffic, and stock availability. See our
          Shipping Policy for details.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cancellations and refunds">
        <p>
          Cancellation and refund eligibility is governed by our Refund Policy.
        </p>
      </LegalSection>

      <LegalSection heading="7. Acceptable use">
        <p>
          You agree not to misuse the Service, including attempting to access
          other users&apos; accounts, interfering with normal operation, or
          using the Service for any unlawful purpose.
        </p>
      </LegalSection>

      <LegalSection heading="8. Intellectual property">
        <p>
          The FastGet name, logo, and app content are owned by FastGet and may
          not be used without permission.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of liability">
        <p>
          FastGet is provided &ldquo;as is&rdquo;. To the extent permitted by
          law, FastGet is not liable for indirect or consequential losses
          arising from delays, stock unavailability, or third-party payment
          processing issues outside our reasonable control.
        </p>
      </LegalSection>

      <LegalSection heading="10. Account termination">
        <p>
          You may delete your account at any time from Account → Delete Account.
          We may suspend or terminate accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing law">
        <p>
          These terms are governed by the laws of India, and disputes are
          subject to the exclusive jurisdiction of the courts in Mumbai,
          Maharashtra.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to these terms">
        <p>
          We may update these terms from time to time; continued use of the
          Service after changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact us">
        <p>
          Questions about these terms? Email{" "}
          <a
            href="mailto:support@elemantra.in"
            className="text-brand-primary font-medium"
          >
            support@elemantra.in
          </a>{" "}
          or call +91 9167119131. Elemantra, Office no - 17, 2nd Floor,
          Bhavan&apos;s Campus, Sardar Patel Technology Business Incubator, Old
          D N Nagar, Munshi Nagar, Andheri West, Mumbai, Maharashtra 400058.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
