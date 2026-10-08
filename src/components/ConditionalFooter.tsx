'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';
import { isStaffRoute } from '@/lib/staff-routes';

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer for admin and agent back-office routes
  if (isStaffRoute(pathname)) {
    return null;
  }

  return <Footer />;
}
