'use client';

import { Category } from '@/types';
import { Hammer, Droplet, Wrench, Zap, Droplets, ChevronRight } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  onClick?: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Hammer,
  Droplet,
  Wrench,
  Zap,
  Droplets,
};

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Wrench;

  return (
    <button
      onClick={onClick}
      aria-label={`Browse ${category.name} category`}
      className="group w-full text-left bg-white rounded-xl border border-neutral-100 p-6 hover:border-primary-200 transition-all duration-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-200">
            <Icon className="w-6 h-6 text-brand-primary group-hover:text-white transition-colors duration-200" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-charcoal group-hover:text-brand-primary transition-colors duration-150">
              {category.name}
            </h3>
            <p className="text-sm text-brand-slate mt-1">{category.description}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-brand-steel group-hover:text-brand-primary group-hover:translate-x-1 transition-all duration-150" />
      </div>
    </button>
  );
}
