'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer for admin and agent back-office routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/agent-dashboard') || pathname.startsWith('/agent/')) {
    return null;
  }
  
  return <Footer />;
}
