'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  carpentry:  '🔨',
  plumbing:   '🔧',
  hardware:   '⚙️',
  electrical: '⚡',
  adhesives:  '🧴',
};

const categories = [
  { id: 'carpentry',  name: 'Carpentry'  },
  { id: 'plumbing',   name: 'Plumbing'   },
  { id: 'hardware',   name: 'Hardware'   },
  { id: 'electrical', name: 'Electrical' },
  { id: 'adhesives',  name: 'Adhesives'  },
];

export function CategoryStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">Shop by Category</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-gray-200 hover:border-brand-primary hover:text-brand-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-gray-200 hover:border-brand-primary hover:text-brand-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog?category=${cat.id}`}
            className="category-pill flex-shrink-0"
          >
            <span className="text-2xl">{CATEGORY_ICONS[cat.id] ?? '📦'}</span>
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-brand-charcoal">{cat.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
