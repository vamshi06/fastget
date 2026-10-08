import type { Metadata } from 'next';
import { BackOfficeShell } from '@/components/BackOfficeShell';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = { title: 'FastGet Admin Panel' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Not an authenticated admin (middleware normally redirects to /login before
  // this runs) - don't leak the sidebar nav to logged-out visitors.
  if (!session || session.role !== 'admin') {
    return <>{children}</>;
  }

  return (
    <BackOfficeShell panelName="Admin Panel" logoHref="/admin">
      {children}
    </BackOfficeShell>
  );
}
