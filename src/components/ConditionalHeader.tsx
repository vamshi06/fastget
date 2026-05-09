'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header for admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Header />;
}
