'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { HomeProductCard } from './HomeProductCard';
import { Product } from '@/types';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  category?: string;
  searchQuery?: string;
  seeAllHref?: string;
  limit?: number;
  accentColor?: string;
  /** Catalog sort (see /api/products ?sort=). */
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'discount';
}

// Same footprint as HomeProductCard so nothing shifts when products arrive.
function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[38vw] max-w-[160px] sm:w-[160px] bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="skeleton aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-2">
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function ProductSection({
  title,
  subtitle,
  category,
  searchQuery,
  seeAllHref,
  limit = 8,
  accentColor = 'brand-primary',
  sort,
}: ProductSectionProps) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Bumped by Retry and by the connection coming back, to refetch.
  const [attempt, setAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (searchQuery) params.set('q', searchQuery);
    if (sort) params.set('sort', sort);
    params.set('limit', String(limit));
    params.set('lang', locale);

    setLoading(true);
    setFailed(false);
    fetch(`/api/products?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProducts(data.data.products);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [category, searchQuery, sort, limit, locale, attempt]);

  // A section that failed (e.g. offline) tries again once the phone is back online.
  useEffect(() => {
    if (!failed) return;
    const onOnline = () => setAttempt((n) => n + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [failed]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  // Nothing to show and nothing went wrong (e.g. an empty category) - hide.
  if (!loading && !failed && products.length === 0) return null;

  const catalogQuery = new URLSearchParams();
  if (category) catalogQuery.set('category', category);
  if (sort && sort !== 'relevance') catalogQuery.set('sort', sort);
  const catalogHref = seeAllHref ?? `/catalog${catalogQuery.toString() ? `?${catalogQuery}` : ''}`;

  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-sm text-brand-slate mt-0.5">{subtitle}</p>}        </div>
        <Link
          href={catalogHref as any}
          className="text-sm font-semibold text-brand-primary hover:text-brand-dark transition-colors flex items-center gap-1 shrink-0"
        >
          {tc('seeAll')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Scroll container with arrow nav */}
      <div className="relative group/row">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          aria-label={t('scrollLeft')}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                     bg-white border border-neutral-200 shadow-md
                     hidden sm:flex items-center justify-center
                     opacity-0 group-hover/row:opacity-100 focus:opacity-100
                     hover:border-brand-primary hover:text-brand-primary
                     transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {failed && products.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 rounded-2xl bg-white border border-neutral-100 text-sm text-brand-slate">
            <span>{t('sectionLoadFailed')}</span>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="flex items-center gap-1.5 font-semibold text-brand-primary shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              {t('retry')}
            </button>
          </div>
        ) : (
        <div
          ref={scrollRef}
          // Phones: row bleeds to the screen edges (cards slide off-screen like
          // a native carousel) and snaps card-by-card.
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 scroll-px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:scroll-px-0 sm:snap-none"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map(product => (
                <HomeProductCard key={product.id} product={product} />
              ))
          }
        </div>
        )}

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          aria-label={t('scrollRight')}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                     bg-white border border-neutral-200 shadow-md
                     hidden sm:flex items-center justify-center
                     opacity-0 group-hover/row:opacity-100 focus:opacity-100
                     hover:border-brand-primary hover:text-brand-primary
                     transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
