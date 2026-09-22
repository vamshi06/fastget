import { getTranslations } from "next-intl/server";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Terms of Service — FastGet" };

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const s4List = t.raw("s4.list") as string[];
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
        <p>{t("s2.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s3.heading")}>
        <p>{t.rich("s3.body", emailTag)}</p>
      </LegalSection>

      <LegalSection heading={t("s4.heading")}>
        <ul className="list-disc pl-5 space-y-1">
          {s4List.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading={t("s5.heading")}>
        <p>{t("s5.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s6.heading")}>
        <p>{t("s6.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s7.heading")}>
        <p>{t("s7.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s8.heading")}>
        <p>{t("s8.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s9.heading")}>
        <p>{t("s9.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s10.heading")}>
        <p>{t("s10.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s11.heading")}>
        <p>{t("s11.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s12.heading")}>
        <p>{t("s12.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s13.heading")}>
        <p>{t.rich("s13.body", emailTag)}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
