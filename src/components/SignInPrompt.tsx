'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, LogIn } from 'lucide-react';

/**
 * Logged-out state for account screens (Orders, Coins, Addresses, Profile,
 * Account): a light, app-style prompt rather than a full-screen photo.
 */
export function SignInPrompt({
  Icon,
  title,
  subtitle,
  redirect,
  benefits,
  badge,
  footnote,
}: {
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  /** Where to land after logging in / signing up. */
  redirect: string;
  benefits?: string[];
  /** Small pill above the icon, e.g. "5 items in cart". */
  badge?: React.ReactNode;
  /** Muted line under the buttons, e.g. "Your cart is saved". */
  footnote?: string;
}) {
  const tc = useTranslations('common');
  const ta = useTranslations('account');
  const q = `?redirect=${encodeURIComponent(redirect)}`;

  return (
    // max-w-md: stays a centred card on desktop instead of stretching edge to edge.
    <div className="px-4 pt-6 pb-4 md:pt-12 md:pb-12">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-neutral-100 shadow-sm px-6 py-8 text-center">
        {badge && (
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 bg-brand-light text-brand-dark text-xs font-bold px-3 py-1.5 rounded-full">
              {badge}
            </span>
          </div>
        )}
        <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-brand-dark" />
        </div>
        <h1 className="text-xl font-black text-brand-charcoal tracking-tight">{title}</h1>
        <p className="text-sm text-brand-slate mt-1.5 max-w-xs mx-auto leading-relaxed">{subtitle}</p>

        {benefits && benefits.length > 0 && (
          <ul className="mt-5 space-y-2.5 text-left max-w-xs mx-auto">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-brand-graphite">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 space-y-2.5 max-w-xs mx-auto">
          <Link href={`/login${q}` as any} className="btn-primary w-full h-12 text-base">
            <LogIn className="w-5 h-5" />
            {tc('login')}
          </Link>
          <Link href={`/signup${q}` as any} className="btn-secondary w-full h-12 text-base">
            {ta('guest.createAccount')}
          </Link>
        </div>
        {footnote && <p className="mt-4 text-xs text-brand-steel">{footnote}</p>}
      </div>
    </div>
  );
}
