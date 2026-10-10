'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CATEGORY_GROUPS } from '@/lib/category-tiles';

function CategoryTile({ slug, name, img, tileKey }: { slug: string; name: string; img: string; tileKey: string }) {
  const href = `/catalog?category=${slug}&sub=${encodeURIComponent(tileKey)}`;
  return (
    <Link href={href as any} className="pressable flex flex-col items-center gap-2 group">
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden relative border border-neutral-100 bg-primary-50"
      >
        {/* The tile names its exact file: a .jpg-then-.png onError fallback
            misses when the 404 lands before hydration, leaving a broken image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${img}`}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <span className="text-[11px] sm:text-xs font-medium text-brand-charcoal text-center leading-tight px-0.5 line-clamp-2">
        {name}
      </span>
    </Link>
  );
}

export default function CategoriesPage() {
  const t = useTranslations('catalog');
  const tCategories = useTranslations('categories');

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Capped width + more columns on wide screens, so tiles stay tile-sized */}
      <div className="max-w-5xl mx-auto px-4 pt-4 md:pt-8 space-y-8">
        {CATEGORY_GROUPS.map((group) => {
          const groupTitle = group.titleCategorySlug
            ? tCategories(`${group.titleCategorySlug}.full`)
            : t(`${group.titleKey}`);
          return (
            <section key={groupTitle}>
              <h2 className="text-xl font-black text-brand-charcoal mb-4">{groupTitle}</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                {group.categories.map((cat) => (
                  <CategoryTile
                    key={`${cat.slug}-${cat.img}`}
                    slug={cat.slug}
                    name={t(`categoryTiles.${cat.tileKey}`)}
                    img={cat.img}
                    tileKey={cat.tileKey}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
