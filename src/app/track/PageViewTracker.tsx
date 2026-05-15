'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string>('');

  useEffect(() => {
    const q = searchParams.toString();
    const key = `${pathname}?${q}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    track('Page Viewed', {
      path: pathname,
      query: q || undefined,
    });
  }, [pathname, searchParams]);

  return null;
}

