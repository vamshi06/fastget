import { getTranslations } from "next-intl/server";
import { LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";

export const metadata = { title: "Privacy Policy — FastGet" };

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal.privacy");
  const s2List = t.raw("s2.list") as string[];
  const s3List = t.raw("s3.list") as string[];

  return (
    <LegalPageLayout title={t("title")} updatedAt="16 June 2026">
      <LegalSection heading={t("s1.heading")}>
        <p>{t("s1.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s2.heading")}>
        <p>{t("s2.intro")}</p>
        <ul className="list-disc pl-5 space-y-1">
          {s2List.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{t("s2.outro")}</p>
      </LegalSection>

      <LegalSection heading={t("s3.heading")}>
        <ul className="list-disc pl-5 space-y-1">
          {s3List.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading={t("s4.heading")}>
        <p>{t("s4.intro")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Razorpay</strong> — {t("s4.razorpay")}
          </li>
          <li>
            <strong>Resend</strong> — {t("s4.resend")}
          </li>
          <li>
            <strong>Cloudinary</strong> — {t("s4.cloudinary")}
          </li>
          <li>
            <strong>Neon (PostgreSQL hosting)</strong> — {t("s4.neon")}
          </li>
        </ul>
        <p>{t("s4.outro")}</p>
      </LegalSection>

      <LegalSection heading={t("s5.heading")}>
        <p>{t("s5.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s6.heading")}>
        <p>{t("s6.body")}</p>
      </LegalSection>

      <LegalSection heading={t("s7.heading")}>
        <p>
          {t.rich("s7.p1", {
            account: (chunks) => <strong>{chunks}</strong>,
            deleteAccount: (chunks) => <strong>{chunks}</strong>,
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
        <p>{t("s7.p2")}</p>
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
        <p>
          {t.rich("s11.body", {
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
