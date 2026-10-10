'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from './UserContext';
import { initAnalytics, onRouteChange, identifyUser, resetUser } from '@/lib/analytics';

// Starts PostHog (see src/lib/analytics.ts) and keeps it in step with the
// route and the signed-in account. Renders nothing.
export function Analytics() {
  const pathname = usePathname();
  const { currentUser, isLoaded } = useUser();
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) onRouteChange(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    if (currentUser && identifiedId.current !== currentUser.id) {
      identifiedId.current = currentUser.id;
      identifyUser(currentUser.id, currentUser.role);
    } else if (!currentUser && identifiedId.current) {
      identifiedId.current = null;
      resetUser();
    }
  }, [isLoaded, currentUser]);

  return null;
}
