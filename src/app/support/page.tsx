import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, Phone, FileText, Truck, RefreshCw, Lock } from "lucide-react";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Support — FastGet" };

export default async function SupportPage() {
  const t = await getTranslations("support");

  const POLICY_LINKS = [
    { href: "/shipping-policy", label: t("commonTopics.shippingPolicy"), Icon: Truck },
    { href: "/refund-policy", label: t("commonTopics.refundPolicy"), Icon: RefreshCw },
    { href: "/privacy-policy", label: t("commonTopics.privacyPolicy"), Icon: Lock },
    { href: "/terms", label: t("commonTopics.termsOfService"), Icon: FileText },
  ];

  return (
    <LegalPageLayout title={t("pageTitle")} updatedAt="16 June 2026">
      <LegalSection heading={t("getInTouch.heading")}>
        <div className="space-y-3">
          <a
            href="mailto:sukhmeet.bedi@elemantra.in"
            className="flex items-center gap-3 text-brand-charcoal hover:text-brand-primary transition-colors"
          >
            <Mail className="w-4 h-4 text-brand-primary flex-shrink-0" />
            sukhmeet.bedi@elemantra.in
          </a>
          <div className="flex items-center gap-3 text-brand-charcoal">
            <Phone className="w-4 h-4 text-brand-primary flex-shrink-0" />
            +91 8847777020
          </div>
        </div>
        <p className="mt-3">{t("getInTouch.orderNote")}</p>
      </LegalSection>

      <LegalSection heading={t("commonTopics.heading")}>
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

      <LegalSection heading={t("manageAccount.heading")}>
        <p>
          {t.rich("manageAccount.body", {
            account: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
