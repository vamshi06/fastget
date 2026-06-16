import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={'/account' as any}
            className="p-2 rounded-xl text-brand-slate hover:text-brand-charcoal hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-brand-charcoal">{title}</h1>
            <p className="text-xs text-brand-steel mt-0.5">Last updated {updatedAt}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="text-sm font-bold text-brand-charcoal mb-2">{heading}</h2>
      <div className="text-sm text-brand-slate leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
