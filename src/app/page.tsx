import { getLocale, getTranslations } from 'next-intl/server';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { ProductSection } from '@/components/home/ProductSection';
import { FlashSaleBanner } from '@/components/home/FlashSaleBanner';
import { getActiveFlashSale } from '@/lib/products';
import { isLocale } from '@/i18n/config';

export default async function Home() {
  const locale = await getLocale();
  const flashSale = await getActiveFlashSale(isLocale(locale) ? locale : undefined);
  const t = await getTranslations('home');

  return (
    <div className="min-h-screen bg-brand-fog">

      {/* 1. Hero banner */}
      <HeroSection />

      {/* 4. Product-heavy feed */}
      <div className="page-container py-6 md:py-8 space-y-8 md:space-y-12">

        {/* Flash sale — only rendered while a sale is actually running */}
        {flashSale && <FlashSaleBanner sale={flashSale} />}

        {/* Category grid — right after hero */}
        <CategoryStrip />

        {/* Best Deals — all categories, show highest discount first */}
        <ProductSection
          title={t('bestDealsTitle')}
          subtitle={t('bestDealsSubtitle')}
          limit={10}
        />

        {/* Carpentry section */}
        <ProductSection
          title={t('carpentryTitle')}
          subtitle={t('carpentrySubtitle')}
          category="carpentry"
          limit={8}
        />

        {/* Civil materials spotlight */}
        <ProductSection
          title={t('civilTitle')}
          subtitle={t('civilSubtitle')}
          category="civil-materials"
          limit={8}
        />

        {/* Plumbing section */}
        <ProductSection
          title={t('plumbingTitle')}
          subtitle={t('plumbingSubtitle')}
          category="plumbing"
          limit={8}
        />

        {/* Electrical section */}
        <ProductSection
          title={t('electricalTitle')}
          subtitle={t('electricalSubtitle')}
          category="electrical"
          limit={8}
        />

        {/* Tools section */}
        <ProductSection
          title={t('toolsTitle')}
          subtitle={t('toolsSubtitle')}
          category="tools-machines"
          limit={8}
        />

      </div>

    </div>
  );
}
