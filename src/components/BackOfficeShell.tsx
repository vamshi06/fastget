'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { BackOfficeSidebarNav } from '@/components/BackOfficeSidebarNav';
import { useUser } from '@/components/UserContext';
import { getPushToken, setPushToken } from '@/lib/native-bridge';

interface BackOfficeShellProps {
  panelName: string; // "Admin Panel" / "Agent Panel"
  logoHref: string;
  children: React.ReactNode;
}

/**
 * Layout for the staff screens (admin + agent panels): a fixed sidebar on
 * desktop, a slide-in drawer behind a menu button on phones/tablets, and a
 * Log out button in both.
 */
export function BackOfficeShell({ panelName, logoHref, children }: BackOfficeShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setCurrentUser } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the mobile drawer whenever the page changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushToken: getPushToken() }),
      });
      setPushToken(null);
    } finally {
      // Also clear the store's signed-in state (header, account page).
      setCurrentUser(null);
      router.push('/login');
      router.refresh();
    }
  };

  const sidebar = (
    <>
      <div className="flex items-center justify-between border-b border-white/10">
        <Link href={logoHref as any} className="flex flex-1 items-center gap-2.5 px-5 py-5 hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-black text-sm">
            F
          </div>
          <div>
            <p className="font-bold text-sm">FastGet</p>
            <p className="text-xs text-white/55">{panelName}</p>
          </div>
        </Link>
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-3 mr-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <BackOfficeSidebarNav />

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
        <Link href="/" className="block px-3 py-1.5 text-xs text-white/55 hover:text-white transition-colors">
          ← Back to Store
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-brand-fog">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-brand-charcoal text-white flex-col flex-shrink-0 sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 max-w-[80%] bg-brand-charcoal text-white flex flex-col h-full overflow-y-auto">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-brand-charcoal text-white">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="font-bold text-sm">FastGet · {panelName}</p>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
