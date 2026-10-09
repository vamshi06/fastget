import { getLocale, getTranslations } from 'next-intl/server';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustStrip } from '@/components/home/TrustStrip';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { getLiveBanners } from '@/lib/banners';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { ProductSection } from '@/components/home/ProductSection';
import { FlashSaleCarousel } from '@/components/home/FlashSaleCarousel';
import { getActiveFlashSales } from '@/lib/products';
import { isLocale } from '@/i18n/config';

export default async function Home() {
  const locale = await getLocale();
  const [flashSales, banners] = await Promise.all([
    getActiveFlashSales(isLocale(locale) ? locale : undefined),
    getLiveBanners(),
  ]);
  const t = await getTranslations('home');

  return (
    <div className="min-h-screen bg-brand-fog">

      <TrustStrip />

      {/* 1. Hero: admin-managed image banners, or the built-in text hero */}
      {banners.length > 0 ? <BannerCarousel banners={banners} /> : <HeroSection />}

      {/* 4. Product-heavy feed */}
      <div className="page-container py-5 md:py-8 space-y-7 md:space-y-12">

        {/* Flash sales - only rendered while at least one sale is running */}
        {flashSales.length > 0 && <FlashSaleCarousel sales={flashSales} />}

        {/* Category grid - right after hero */}
        <CategoryStrip />

        {/* Best Deals - all categories, show highest discount first */}
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
