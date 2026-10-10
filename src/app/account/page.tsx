'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useUser } from '@/components/UserContext';
import { useWishlist } from '@/components/WishlistContext';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { SignInPrompt } from '@/components/SignInPrompt';
import { setLocale } from '@/i18n/actions';
import {
  ClipboardList,
  MapPin,
  Headphones,
  Truck,
  RefreshCw,
  Lock,
  FileText,
  LogOut,
  ChevronRight,
  ChevronDown,
  User,
  BookOpen,
  Coins,
  Gift,
  Heart,
  Languages,
  LayoutDashboard,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeContext';
import { THEME_PREFERENCES } from '@/lib/theme';

/* ─── Shared menu rows ──────────────────────────────────────────────────── */

const rowCls = 'pressable flex items-center px-4 py-3.5 active:bg-neutral-50 hover:bg-neutral-50 transition-colors';

function RowIcon({ Icon, danger }: { Icon: React.ElementType; danger?: boolean }) {
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', danger ? 'bg-red-50' : 'bg-brand-light')}>
      <Icon className={cn('w-[18px] h-[18px]', danger ? 'text-red-500' : 'text-brand-dark')} />
    </div>
  );
}

function MenuItem({ href, label, Icon, value }: { href: string; label: string; Icon: React.ElementType; value?: string }) {
  return (
    <Link href={href as any} className={rowCls}>
      <RowIcon Icon={Icon} />
      <span className="ml-3 text-[15px] font-medium flex-1 text-brand-charcoal">{label}</span>
      {value && <span className="text-sm text-brand-slate mr-1.5">{value}</span>}
      <ChevronRight className="w-4 h-4 text-brand-steel" />
    </Link>
  );
}

function MenuGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mt-4">
      {title && <h2 className="px-1 mb-1.5 text-xs font-bold uppercase tracking-wider text-brand-steel">{title}</h2>}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 divide-y divide-neutral-100">
        {children}
      </div>
    </section>
  );
}

/** Language moved here from the header. Shows the current one; tap switches. */
function LanguageRow() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      await setLocale(locale === 'en' ? 'hi' : 'en');
      router.refresh();
    });
  };

  return (
    <button type="button" onClick={toggle} disabled={isPending} className={cn(rowCls, 'w-full text-left disabled:opacity-60')}>
      <RowIcon Icon={Languages} />
      <span className="ml-3 text-[15px] font-medium flex-1 text-brand-charcoal">{t('menu.language')}</span>
      {/* Both names in their own script, so either reader can find theirs */}
      <span className="flex items-center rounded-full bg-brand-fog p-0.5 text-xs font-semibold">
        <span className={cn('px-2.5 py-1 rounded-full', locale === 'en' ? 'bg-white shadow-sm text-brand-charcoal' : 'text-brand-slate')}>English</span>
        <span className={cn('px-2.5 py-1 rounded-full', locale === 'hi' ? 'bg-white shadow-sm text-brand-charcoal' : 'text-brand-slate')}>हिन्दी</span>
      </span>
    </button>
  );
}

const THEME_LABEL_KEYS = {
  light: 'menu.themeLight',
  dark: 'menu.themeDark',
  system: 'menu.themeSystem',
} as const;

function ThemeRow() {
  const t = useTranslations('account');
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div className="flex items-center px-4 py-3.5">
      <RowIcon Icon={resolvedTheme === 'dark' ? Moon : Sun} />
      <span className="ml-3 text-[15px] font-medium flex-1 text-brand-charcoal">{t('menu.theme')}</span>
      <span role="radiogroup" aria-label={t('menu.theme')} className="flex items-center rounded-full bg-brand-fog p-0.5 text-xs font-semibold">
        {THEME_PREFERENCES.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preference === p}
            onClick={() => setPreference(p)}
            className={cn('pressable px-2.5 py-1 rounded-full', preference === p ? 'bg-white shadow-sm text-brand-charcoal' : 'text-brand-slate')}
          >
            {t(THEME_LABEL_KEYS[p])}
          </button>
        ))}
      </span>
    </div>
  );
}

const POLICY_ITEMS = [
  { href: '/shipping-policy', labelKey: 'menu.shippingPolicy', Icon: Truck     },
  { href: '/refund-policy',   labelKey: 'menu.refundPolicy',   Icon: RefreshCw },
  { href: '/privacy-policy',  labelKey: 'menu.privacyPolicy',  Icon: Lock      },
  { href: '/terms',           labelKey: 'menu.termsOfService', Icon: FileText },
] as const;

function PoliciesRow() {
  const t = useTranslations('account');
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={cn(rowCls, 'w-full text-left')}>
        <RowIcon Icon={BookOpen} />
        <span className="ml-3 text-[15px] font-medium text-brand-charcoal flex-1">{t('menu.policies')}</span>
        <ChevronDown className={cn('w-4 h-4 text-brand-steel transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-neutral-100 divide-y divide-neutral-100 bg-neutral-50/60">
          {POLICY_ITEMS.map((item) => (
            <Link key={item.href} href={item.href as any} className="flex items-center pl-16 pr-4 py-3 text-sm text-brand-graphite">
              <span className="flex-1">{t(item.labelKey)}</span>
              <ChevronRight className="w-4 h-4 text-brand-steel" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rows everyone gets, signed in or not. */
function HelpRows() {
  const t = useTranslations('account');
  return (
    <>
      <LanguageRow />
      <ThemeRow />
      <MenuItem href="/support" label={t('menu.support')} Icon={Headphones} />
      <PoliciesRow />
    </>
  );
}

/* ─── Guest screen ──────────────────────────────────────────────────────── */

function GuestAccount() {
  const t = useTranslations('account');
  return (
    <div className="min-h-screen bg-brand-fog pb-8">
      <SignInPrompt Icon={User} title={t('guest.heading')} subtitle={t('guest.subtitle')} redirect="/account" />
      <MenuGroup title={t('menu.settings')}>
        <MenuItem href="/wishlist" label={t('menu.wishlist')} Icon={Heart} />
        <HelpRows />
      </MenuGroup>
    </div>
  );
}

/* ─── Authenticated account page ────────────────────────────────────────── */

export default function AccountPage() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const { currentUser, isLoaded, logout } = useUser();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const [coinBalance, setCoinBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/coins/balance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.balance === 'number') setCoinBalance(data.balance);
      })
      .catch(() => {});
  }, [currentUser]);

  // Still hydrating
  if (!isLoaded) return null;

  // Guest state - no redirect, just show the guest screen
  if (!currentUser) return <GuestAccount />;

  const displayPhone = currentUser.phone
    ? '+91 ' + currentUser.phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10)
    : currentUser.email;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const tiles = [
    { href: '/my-orders', label: t('menu.orders'), Icon: ClipboardList, value: null },
    { href: '/my-coins', label: t('menu.coins'), Icon: Coins, value: coinBalance ?? '–' },
    { href: '/wishlist', label: t('menu.wishlist'), Icon: Heart, value: wishlistCount || null },
  ];

  return (
    <div className="min-h-screen bg-brand-fog pb-8">

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 flex items-center gap-3.5">
        <div className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-black text-white">{currentUser.name?.charAt(0).toUpperCase() || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-brand-charcoal truncate">{currentUser.name}</h1>
          <p className="text-sm text-brand-slate truncate">{displayPhone}</p>
        </div>
        <Link href={'/my-profile' as any} className="pressable text-sm font-bold text-brand-dark px-2 py-1">
          {t('menu.editProfile')}
        </Link>
      </div>

      {/* Quick tiles */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
        {tiles.map(({ href, label, Icon, value }) => (
          <Link key={href} href={href as any} className="pressable bg-white rounded-2xl shadow-sm border border-neutral-100 py-3.5 flex flex-col items-center gap-1.5">
            <Icon className="w-6 h-6 text-brand-dark" />
            <span className="text-[13px] font-semibold text-brand-charcoal">{label}</span>
            {value !== null && <span className="text-xs font-bold text-brand-slate -mt-1">{value}</span>}
          </Link>
        ))}
      </div>

      {/* Admin-only shortcut - the way into the admin panel on a phone */}
      {currentUser.role === 'admin' && (
        <Link
          href={'/admin' as any}
          className="mx-4 mt-3 flex items-center px-4 py-3.5 bg-brand-charcoal text-white rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-[18px] h-[18px] text-white" />
          </div>
          <p className="ml-3 flex-1 text-sm font-semibold">{tNav('adminDashboard')}</p>
          <ChevronRight className="w-4 h-4 text-white/70" />
        </Link>
      )}

      {/* Refer & Earn */}
      <Link
        href={'/refer' as any}
        className="pressable mx-4 mt-3 flex items-center px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#FEF3DC] to-[#FDE3B0] dark:from-brand-light dark:to-primary-200 border border-primary-200"
      >
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-brand-dark" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-[15px] font-bold text-brand-charcoal">{t('menu.referAndEarn')}</p>
          <p className="text-xs text-brand-graphite">{t('menu.referAndEarnSubtitle')}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-brand-graphite" />
      </Link>

      <MenuGroup>
        <MenuItem href="/my-addresses" label={t('menu.myAddresses')} Icon={MapPin} />
        <MenuItem href="/my-profile" label={t('menu.myProfile')} Icon={User} />
      </MenuGroup>

      <MenuGroup title={t('menu.settings')}>
        <HelpRows />
      </MenuGroup>

      <MenuGroup>
        <button onClick={handleLogout} className={cn(rowCls, 'w-full text-left')}>
          <RowIcon Icon={LogOut} danger />
          <span className="ml-3 text-[15px] font-medium text-red-600 flex-1">{tc('signOut')}</span>
        </button>
        <DeleteAccountButton variant="card" />
      </MenuGroup>
    </div>
  );
}
