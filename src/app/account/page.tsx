'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
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
  LogIn,
  UserPlus,
  User,
  ShieldCheck,
  Star,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Shared menu item ──────────────────────────────────────────────────── */

function MenuItem({
  href,
  label,
  Icon,
  isLast,
  danger,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  isLast: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href as any}
      className={cn(
        'flex items-center px-4 py-4 hover:bg-neutral-50 transition-colors',
        !isLast && 'border-b border-neutral-100'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        danger ? 'bg-red-50' : 'bg-brand-light'
      )}>
        <Icon className={cn('w-5 h-5', danger ? 'text-red-500' : 'text-brand-dark')} />
      </div>
      <span className={cn('ml-3 text-sm font-medium flex-1', danger ? 'text-red-600' : 'text-brand-charcoal')}>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-brand-steel" />
    </Link>
  );
}

/* ─── Public links (visible without auth) ───────────────────────────────── */

const PUBLIC_ITEMS = [
  { href: '/support', label: 'FastGet Support', Icon: Headphones },
];

const POLICY_ITEMS = [
  { href: '/shipping-policy', label: 'Shipping Policy', Icon: Truck     },
  { href: '/refund-policy',   label: 'Refund Policy',   Icon: RefreshCw },
  { href: '/privacy-policy',  label: 'Privacy Policy',  Icon: Lock      },
  { href: '/terms',           label: 'Terms of Service', Icon: FileText },
];

/* ─── Policies accordion (shared between guest + auth screens) ──────────── */

function PoliciesSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center px-4 py-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-brand-dark" />
        </div>
        <span className="ml-3 text-sm font-medium text-brand-charcoal flex-1 text-left">Policies</span>
        <ChevronDown className={cn('w-4 h-4 text-brand-steel transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-neutral-100">
          {POLICY_ITEMS.map((item, idx) => (
            <MenuItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              isLast={idx === POLICY_ITEMS.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Guest screen ──────────────────────────────────────────────────────── */

function GuestAccount() {
  return (
    <div className="min-h-screen bg-brand-fog pb-8">

      {/* Hero card */}
      <div className="bg-white px-6 pt-12 pb-8 text-center border-b border-neutral-100 shadow-sm">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <User className="w-10 h-10 text-neutral-400" />
        </div>
        <h1 className="text-xl font-black text-brand-charcoal">Welcome to FastGet</h1>
        <p className="text-sm text-brand-slate mt-2 max-w-xs mx-auto leading-relaxed">
          Sign in to manage your orders, addresses, and account settings.
        </p>
      </div>

      {/* CTAs */}
      <div className="px-4 pt-6 space-y-3">
        <Link
          href={'/login?redirect=/account' as any}
          className="flex items-center justify-center gap-2.5 w-full py-4 bg-brand-primary text-white font-bold rounded-2xl text-base shadow-md hover:bg-brand-dark transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Log In
        </Link>
        <Link
          href={'/signup?redirect=/account' as any}
          className="flex items-center justify-center gap-2.5 w-full py-4 bg-white text-brand-charcoal font-semibold rounded-2xl text-base border border-neutral-200 shadow-sm hover:border-brand-primary hover:text-brand-primary transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Create an Account
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-4 mt-7 mb-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-brand-steel font-medium">More</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Public links */}
      <div className="mx-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
        {PUBLIC_ITEMS.map((item, idx) => (
          <MenuItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            isLast={idx === PUBLIC_ITEMS.length - 1}
          />
        ))}
      </div>

      <PoliciesSection />

      <p className="text-center text-xs text-brand-steel mt-6">FastGet v1.0.0</p>
    </div>
  );
}

/* ─── Authenticated account page ────────────────────────────────────────── */

const AUTH_ITEMS = [
  { href: '/my-orders',    label: 'Order History', Icon: ClipboardList },
  { href: '/my-addresses', label: 'My Addresses',  Icon: MapPin        },
];

export default function AccountPage() {
  const { currentUser, isLoaded, logout } = useUser();
  const router = useRouter();

  // Still hydrating
  if (!isLoaded) return null;

  // Guest state — no redirect, just show the guest screen
  if (!currentUser) return <GuestAccount />;

  const displayPhone = currentUser.phone
    ? '+91 ' + currentUser.phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10)
    : currentUser.email;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-brand-fog pb-4">

      {/* Profile header */}
      <div className="bg-white px-4 py-6 text-center border-b border-neutral-100 shadow-sm">
        <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
          <span className="text-2xl font-black text-white">
            {currentUser.name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        <h1 className="text-lg font-bold text-brand-charcoal">{currentUser.name}</h1>
        <p className="text-sm text-brand-slate mt-0.5">{displayPhone}</p>
      </div>

      {/* Auth-only items */}
      <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
        {AUTH_ITEMS.map((item, idx) => (
          <MenuItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            isLast={idx === AUTH_ITEMS.length - 1}
          />
        ))}
      </div>

      {/* Public items */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
        {PUBLIC_ITEMS.map((item, idx) => (
          <MenuItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            isLast={idx === PUBLIC_ITEMS.length - 1}
          />
        ))}
      </div>

      <PoliciesSection />

      {/* Log Out */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-4 hover:bg-red-50 transition-colors"
        >
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <span className="ml-3 text-sm font-medium text-red-600 flex-1 text-left">Log Out</span>
          <ChevronRight className="w-4 h-4 text-brand-steel" />
        </button>
      </div>

      <p className="text-center text-xs text-brand-steel mt-8">FastGet v1.0.0</p>
    </div>
  );
}
