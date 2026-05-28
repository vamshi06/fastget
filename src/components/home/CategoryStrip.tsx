'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// One SVG icon per category table
const CATEGORY_SVG: Record<string, React.ReactNode> = {
  carpentry: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  paints: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M19 11c0 5-7 10-7 10S5 16 5 11a7 7 0 0 1 14 0z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  plumbing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  ),
  'civil-materials': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="2" y="14" width="20" height="7" rx="1" />
      <polygon points="12 3 2 14 22 14" />
    </svg>
  ),
  electrical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  'flooring-ceilings': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="2" y="4" width="20" height="4" rx="1" />
      <rect x="2" y="16" width="20" height="4" rx="1" />
      <path d="M12 8v8" />
    </svg>
  ),
  'glass-aluminium': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
    </svg>
  ),
  'tools-machines': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
};

// One entry per category table
const CATEGORIES = [
  { slug: 'carpentry',         name: 'Carpentry'         },
  { slug: 'paints',            name: 'Paints & Polish'   },
  { slug: 'plumbing',          name: 'Plumbing'          },
  { slug: 'civil-materials',   name: 'Civil & Tiles'     },
  { slug: 'electrical',        name: 'Electrical'        },
  { slug: 'flooring-ceilings', name: 'Flooring'          },
  { slug: 'glass-aluminium',   name: 'Glass & Aluminium' },
  { slug: 'tools-machines',    name: 'Tools & Machines'  },
];

export function CategoryStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">Shop by Category</h2>
          <div className="speed-accent mt-1.5" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-neutral-200 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50 transition-all duration-150"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-neutral-200 bg-white hover:border-brand-primary hover:text-brand-primary hover:bg-primary-50 transition-all duration-150"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/catalog?category=${cat.slug}`}
            className="category-pill flex-shrink-0 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all duration-200">
              {CATEGORY_SVG[cat.slug]}
            </div>
            <span className="text-xs font-semibold text-brand-graphite group-hover:text-brand-primary transition-colors duration-150">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
