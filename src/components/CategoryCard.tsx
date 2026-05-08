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
      className="group w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {category.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{category.description}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}
