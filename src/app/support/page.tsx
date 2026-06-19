import Link from "next/link";
import { Mail, Phone, FileText, Truck, RefreshCw, Lock } from "lucide-react";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Support — FastGet" };

const POLICY_LINKS = [
  { href: "/shipping-policy", label: "Shipping Policy", Icon: Truck },
  { href: "/refund-policy", label: "Refund Policy", Icon: RefreshCw },
  { href: "/privacy-policy", label: "Privacy Policy", Icon: Lock },
  { href: "/terms", label: "Terms of Service", Icon: FileText },
];

export default function SupportPage() {
  return (
    <LegalPageLayout title="FastGet Support" updatedAt="16 June 2026">
      <LegalSection heading="Get in touch">
        <div className="space-y-3">
          <a
            href="mailto:support@elemantra.in"
            className="flex items-center gap-3 text-brand-charcoal hover:text-brand-primary transition-colors"
          >
            <Mail className="w-4 h-4 text-brand-primary flex-shrink-0" />
            support@elemantra.in
          </a>
          <div className="flex items-center gap-3 text-brand-charcoal">
            <Phone className="w-4 h-4 text-brand-primary flex-shrink-0" />
            +91 9167119131
          </div>
        </div>
        <p className="mt-3">
          For order issues, include your order number so we can help faster.
        </p>
      </LegalSection>

      <LegalSection heading="Common topics">
        <ul className="space-y-2">
          {POLICY_LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href as any}
                className="flex items-center gap-2.5 text-brand-charcoal hover:text-brand-primary transition-colors"
              >
                <Icon className="w-4 h-4 text-brand-primary flex-shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading="Manage your account">
        <p>
          You can update your saved addresses, view order history, or
          permanently delete your account from <strong>Account</strong> in the
          app or on the website.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
