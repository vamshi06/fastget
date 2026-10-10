'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from './Header';
import { isStaffRoute } from '@/lib/staff-routes';
import { isAuthRoute } from '@/lib/auth-routes';

export function ConditionalHeader() {
  const pathname = usePathname();
  // Defaults to false (website) so SSR/hydration matches; flips true almost
  // immediately inside the wrapped Android app, where its own native chrome
  // replaces this header on the auth screens.
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(!!(window as any).ReactNativeWebView);
  }, []);

  if (isStaffRoute(pathname)) {
    return null;
  }

  if (isAuthRoute(pathname) && isNativeApp) {
    return null;
  }

  return <Header />;
}
