'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CATEGORY_GROUPS } from '@/lib/category-tiles';

function CategoryTile({ slug, name, img, keyword }: { slug: string; name: string; img: string; keyword: string }) {
  const href = `/catalog?category=${slug}&q=${encodeURIComponent(keyword)}`;
  return (
    <Link href={href as any} className="pressable flex flex-col items-center gap-2 group">
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden relative border border-neutral-100 bg-primary-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${img}.jpg`}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.src.endsWith('.png')) { el.src = `/categories/${img}.png`; }
            else { el.style.display = 'none'; }
          }}
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
      <div className="px-4 pt-4 space-y-8">
        {CATEGORY_GROUPS.map((group) => {
          const groupTitle = group.titleCategorySlug
            ? tCategories(`${group.titleCategorySlug}.full`)
            : t(`${group.titleKey}`);
          return (
            <section key={groupTitle}>
              <h2 className="text-xl font-black text-brand-charcoal mb-4">{groupTitle}</h2>
              <div className="grid grid-cols-4 gap-3">
                {group.categories.map((cat) => (
                  <CategoryTile
                    key={`${cat.slug}-${cat.img}`}
                    slug={cat.slug}
                    name={t(`categoryTiles.${cat.tileKey}`)}
                    img={cat.img}
                    keyword={cat.keyword}
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
