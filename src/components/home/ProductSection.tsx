'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-44 sm:w-48 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="skeleton h-36 w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 w-14 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-8 w-full rounded-xl mt-2" />
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
}: ProductSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (searchQuery) params.set('q', searchQuery);
    params.set('limit', String(limit));

    fetch(`/api/products?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProducts(data.data.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, searchQuery, limit]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  const catalogHref = seeAllHref ?? (category ? `/catalog?category=${category}` : '/catalog');

  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-sm text-brand-slate mt-0.5">{subtitle}</p>}
          <div className="speed-accent mt-1.5" />
        </div>
        <Link
          href={catalogHref as any}
          className="text-sm font-semibold text-brand-primary hover:text-brand-dark transition-colors flex items-center gap-1 shrink-0"
        >
          See All
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Scroll container with arrow nav */}
      <div className="relative group/row">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                     bg-white border border-neutral-200 shadow-md
                     hidden sm:flex items-center justify-center
                     opacity-0 group-hover/row:opacity-100 focus:opacity-100
                     hover:border-brand-primary hover:text-brand-primary
                     transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map(product => (
                <HomeProductCard key={product.id} product={product} />
              ))
          }
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
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
