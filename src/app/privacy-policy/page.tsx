import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Privacy Policy — FastGet" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updatedAt="16 June 2026">
      <LegalSection heading="1. Who we are">
        <p>
          FastGet is operated by Elemantra (&ldquo;Elemantra&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), registered at
          Office no - 17, 2nd Floor, Bhavan&apos;s Campus, Sardar Patel
          Technology Business Incubator, Old D N Nagar, Munshi Nagar, Andheri
          West, Mumbai, Maharashtra 400058. This Privacy Policy explains what
          information we collect through the FastGet website and mobile app, how
          we use it, and the choices you have.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <p>
          When you create an account, place an order, or contact support, we
          collect:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Account details: name, email address, phone number, and password
            (stored as a one-way hash, never in plain text)
          </li>
          <li>Delivery addresses you save to your account</li>
          <li>Order history: items purchased, order status, and invoices</li>
          <li>Communications you send us (e.g. support requests)</li>
        </ul>
        <p>
          We do not collect your device location or contacts, and the app
          requests no permissions beyond internet access.
        </p>
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account and process orders</li>
          <li>
            To send order confirmations, delivery updates, and
            verification/password-reset emails
          </li>
          <li>To provide customer support</li>
          <li>To improve and secure our service</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Sharing with third parties">
        <p>
          We share the minimum information necessary with the following service
          providers, who act on our behalf:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Razorpay</strong> — processes your payments (cards, UPI, net
            banking). Razorpay receives your payment details directly; FastGet
            never stores your card or UPI credentials.
          </li>
          <li>
            <strong>Resend</strong> — delivers transactional emails (signup
            verification, password reset, order updates) on our behalf.
          </li>
          <li>
            <strong>Cloudinary</strong> — hosts product images; no personal
            information is sent to Cloudinary.
          </li>
          <li>
            <strong>Neon (PostgreSQL hosting)</strong> — stores our application
            database, including your account and order data, on infrastructure
            hosted in AWS ap-southeast-1.
          </li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>
      </LegalSection>

      <LegalSection heading="5. Cookies and local storage">
        <p>
          We use a secure, encrypted session cookie to keep you signed in, and
          store your cart and wishlist locally on your device so they persist
          between visits. These are functional and are not used for advertising
          or cross-site tracking.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data retention">
        <p>
          We retain your account and order data for as long as your account is
          active, or as required to comply with legal, tax, and accounting
          obligations. You can request deletion at any time as described below.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights, including account deletion">
        <p>
          You can review and update your saved addresses at any time from{" "}
          <strong>Account</strong> in the app. To permanently delete your
          account and associated data (addresses and wishlist), go to{" "}
          <strong>Account → Delete Account</strong> in the app or website and
          confirm with your password. This is available whether or not you have
          the app installed, by visiting our website. You can also request
          deletion by emailing{" "}
          <a
            href="mailto:support@elemantra.in"
            className="text-brand-primary font-medium"
          >
            support@elemantra.in
          </a>
          .
        </p>
        <p>
          Order records required for tax/accounting purposes may be retained as
          required by law even after account deletion.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          Passwords are stored using one-way hashing (bcrypt). Data in transit
          is encrypted via HTTPS. Session cookies are HTTP-only and signed.
          Access to the production database is restricted to authorized
          personnel.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children's privacy">
        <p>
          FastGet is intended for business and contractor use and is not
          directed at children under 18. We do not knowingly collect data from
          children.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by updating the &ldquo;Last updated&rdquo; date above.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact us">
        <p>
          For privacy questions or data requests, contact us at{" "}
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
