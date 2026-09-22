'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { setLocale } from '@/i18n/actions';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === 'en' ? 'hi' : 'en';
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={t('switchLanguage')}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-brand-charcoal hover:bg-neutral-100 transition-colors disabled:opacity-50',
        className,
      )}
    >
      <Languages className="w-4 h-4" />
      <span>{locale === 'en' ? 'हिं' : 'EN'}</span>
    </button>
  );
}
