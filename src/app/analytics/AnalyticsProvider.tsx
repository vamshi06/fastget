'use client';

import { useEffect } from 'react';
import { initPosthog } from '@/lib/posthog';
import PageViewTracker from '@/app/track/PageViewTracker';

export default function AnalyticsProvider() {
  useEffect(() => {
    initPosthog();
  }, []);

  return <PageViewTracker />;
}


