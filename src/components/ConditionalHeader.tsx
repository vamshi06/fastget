'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from './Header';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function ConditionalHeader() {
  const pathname = usePathname();
  // Defaults to false (website) so SSR/hydration matches; flips true almost
  // immediately inside the wrapped Android app, where its own native chrome
  // replaces this header on the auth screens.
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(!!(window as any).ReactNativeWebView);
  }, []);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  if (AUTH_ROUTES.includes(pathname) && isNativeApp) {
    return null;
  }

  return <Header />;
}
