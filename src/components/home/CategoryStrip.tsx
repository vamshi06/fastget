'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

const CATEGORY_SLUGS = [
  'civil-materials',
  'flooring-ceilings',
  'paints',
  'plumbing',
  'carpentry',
  'electrical',
  'tools-machines',
  'glass-aluminium',
];

function CategoryTile({ slug, name }: { slug: string; name: string }) {
  return (
    <Link href={`/catalog?category=${slug}`} className="flex flex-col items-center gap-2 group">
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden relative"
        style={{ backgroundColor: '#dbeafe' }}
      >
        {/* Placeholder shown until real image is added */}
        <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
          {/* <span className="text-[9px] text-neutral-400 text-center leading-tight px-1">{name}</span> */}
          <span className="text-[9px] text-neutral-400 text-center leading-tight px-1"></span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${slug}.jpg`}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.src.endsWith('.png')) { el.src = `/categories/${slug}.png`; }
            else { el.style.display = 'none'; }
          }}
        />
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-brand-charcoal text-center leading-tight px-0.5">
        {name}
      </span>
    </Link>
  );
}

export function CategoryStrip() {
  const t = useTranslations('home');
  const tCategories = useTranslations('categories');
  const tc = useTranslations('common');

  return (
    <section>
      <div className="section-header mb-4">
        <div>
          <h2 className="section-title">{t('shopByCategory')}</h2>
          <div className="speed-accent mt-1.5" />
        </div>
        <Link
          href="/categories"
          className="text-sm font-semibold text-brand-primary hover:text-brand-dark transition-colors flex items-center gap-1"
        >
          {tc('viewAll')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {CATEGORY_SLUGS.map((slug) => (
          <CategoryTile key={slug} slug={slug} name={tCategories(`${slug}.full`)} />
        ))}
      </div>
    </section>
  );
}
