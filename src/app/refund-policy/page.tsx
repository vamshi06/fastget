import { getTranslations } from "next-intl/server";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Refund Policy — FastGet" };

export default async function RefundPolicyPage() {
  const t = await getTranslations("legal.refund");
  const emailTag = {
    email: (chunks: React.ReactNode) => (
      <a
        href="mailto:sukhmeet.bedi@elemantra.in"
        className="text-brand-primary font-medium"
      >
        {chunks}
      </a>
    ),
  };

  return (
    <LegalPageLayout title={t("title")} updatedAt="16 June 2026">
      <LegalSection heading={t("s1.heading")}>
        <p>{t("s1.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s2.heading")}>
        <p>{t.rich("s2.body", emailTag)}</p>
      </LegalSection>

      <LegalSection heading={t("s3.heading")}>
        <p>{t("s3.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s4.heading")}>
        <p>{t("s4.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s5.heading")}>
        <p>{t.rich("s5.body", emailTag)}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
