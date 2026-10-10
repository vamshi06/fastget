import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Home, Package, SearchX } from 'lucide-react';

// Branded 404 - replaces Next.js's default black-on-white page.
export default async function NotFound() {
  const t = await getTranslations('common');

  return (
    <div className="min-h-[60vh] bg-brand-fog flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-5">
          <SearchX className="w-11 h-11 text-brand-dark" />
        </div>
        <p className="text-sm font-bold text-brand-primary mb-1">404</p>
        <h1 className="text-xl md:text-2xl font-black text-brand-charcoal mb-1.5">{t('notFoundTitle')}</h1>
        <p className="text-sm text-brand-slate mb-6">{t('notFoundMessage')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary inline-flex px-8 h-12 text-base">
            <Home className="w-5 h-5" />
            {t('goHome')}
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-xl border border-neutral-200 bg-white text-brand-charcoal font-semibold hover:border-brand-primary transition-colors"
          >
            <Package className="w-5 h-5" />
            {t('browseProducts')}
          </Link>
        </div>
      </div>
    </div>
  );
}
