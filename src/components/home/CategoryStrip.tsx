'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { slug: 'civil-materials',   name: 'Civil Materials'     },
  { slug: 'flooring-ceilings', name: 'Tiling & Flooring'   },
  { slug: 'paints',            name: 'Paints & Polish'      },
  { slug: 'plumbing',          name: 'Plumbing'             },
  { slug: 'carpentry',         name: 'Carpentry'            },
  { slug: 'electrical',        name: 'Electrical'           },
  { slug: 'tools-machines',    name: 'Tools & Machines'     },
  { slug: 'glass-aluminium',   name: 'Glass & Aluminium'    },
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
          <span className="text-[9px] text-neutral-400 text-center leading-tight px-1">{name}</span>
        </div>
        {/* Drop category images into /public/categories/{slug}.png to replace */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${slug}.png`}
          alt={name}
          className="absolute inset-0 w-full h-full object-contain p-2"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-brand-charcoal text-center leading-tight px-0.5">
        {name}
      </span>
    </Link>
  );
}

export function CategoryStrip() {
  return (
    <section>
      <div className="section-header mb-4">
        <div>
          <h2 className="section-title">Shop by Category</h2>
          <div className="speed-accent mt-1.5" />
        </div>
        <Link
          href="/catalog"
          className="text-sm font-semibold text-brand-primary hover:text-brand-dark transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {CATEGORIES.map((cat) => (
          <CategoryTile key={cat.slug} slug={cat.slug} name={cat.name} />
        ))}
      </div>
    </section>
  );
}
