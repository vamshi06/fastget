import { getTranslations } from "next-intl/server";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Shipping Policy — FastGet" };

export default async function ShippingPolicyPage() {
  const t = await getTranslations("legal.shipping");

  return (
    <LegalPageLayout title={t("title")} updatedAt="16 June 2026">
      <LegalSection heading={t("s1.heading")}>
        <p>{t("s1.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s2.heading")}>
        <p>
          {t.rich("s2.body", {
            account: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </LegalSection>

      <LegalSection heading={t("s3.heading")}>
        <p>{t("s3.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s4.heading")}>
        <p>{t("s4.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s5.heading")}>
        <p>
          {t.rich("s5.body", {
            email: (chunks) => (
              <a
                href="mailto:sukhmeet.bedi@elemantra.in"
                className="text-brand-primary font-medium"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
