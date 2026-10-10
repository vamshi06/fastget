'use client';

import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { cn } from '@/lib/utils';

/** Header icon button: flips between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const { resolvedTheme, setPreference } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
      title={isDark ? t('switchToLight') : t('switchToDark')}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-xl text-brand-charcoal hover:bg-neutral-100 transition-colors',
        className,
      )}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}
