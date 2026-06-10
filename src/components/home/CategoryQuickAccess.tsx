import Link from 'next/link';

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

const CATEGORIES = [
  { slug: 'tools-machines',    name: 'Tools',     bg: 'bg-orange-50',  border: 'border-orange-100',  text: 'text-orange-600'  },
  { slug: 'carpentry',         name: 'Carpentry', bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-600'   },
  { slug: 'paints',            name: 'Paints',    bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-600'    },
  { slug: 'plumbing',          name: 'Plumbing',  bg: 'bg-cyan-50',    border: 'border-cyan-100',    text: 'text-cyan-600'    },
  { slug: 'civil-materials',   name: 'Civil',     bg: 'bg-stone-50',   border: 'border-stone-100',   text: 'text-stone-600'   },
  { slug: 'electrical',        name: 'Electrical',bg: 'bg-yellow-50',  border: 'border-yellow-100',  text: 'text-yellow-600'  },
  { slug: 'flooring-ceilings', name: 'Flooring',  bg: 'bg-green-50',   border: 'border-green-100',   text: 'text-green-600'   },
  { slug: 'glass-aluminium',   name: 'Glass & Alu',bg: 'bg-sky-50',   border: 'border-sky-100',     text: 'text-sky-600'     },
];

export function CategoryQuickAccess() {
  return (
    <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto hide-scrollbar py-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/catalog?category=${cat.slug}`}
          className="flex flex-col items-center gap-2 flex-shrink-0 group"
          style={{ minWidth: 64 }}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border
                        ${cat.bg} ${cat.border} ${cat.text}
                        group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary
                        group-hover:scale-105 transition-all duration-200`}
          >
            {CATEGORY_SVG[cat.slug]}
          </div>
          <span className="text-[11px] font-semibold text-brand-charcoal group-hover:text-brand-primary
                           text-center leading-tight whitespace-nowrap transition-colors duration-150">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
