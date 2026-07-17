import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminSidebarNav } from './components/AdminSidebarNav';

export const metadata: Metadata = { title: 'FastGet Admin Panel' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-brand-fog">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-charcoal text-white flex flex-col flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-black text-sm">
            F
          </div>
          <div>
            <p className="font-bold text-sm">FastGet</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </Link>

        <AdminSidebarNav />

        <div className="px-5 py-4 border-t border-white/10">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Back to Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
