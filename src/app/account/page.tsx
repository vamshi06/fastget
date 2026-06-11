'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  { href: '/my-orders',       label: 'Order History',   Icon: ClipboardList },
  { href: '/my-addresses',    label: 'My Addresses',    Icon: MapPin        },
  { href: '/support',         label: 'FastGet Support', Icon: Headphones    },
  { href: '/shipping-policy', label: 'Shipping Policy', Icon: Truck         },
  { href: '/refund-policy',   label: 'Refund Policy',   Icon: RefreshCw     },
  { href: '/privacy-policy',  label: 'Privacy Policy',  Icon: Lock          },
  { href: '/terms',           label: 'Terms of Service', Icon: FileText     },
];

function MenuItem({
  href,
  label,
  Icon,
  isLast,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  isLast: boolean;
}) {
  return (
    <Link
      href={href as any}
      className={cn(
        'flex items-center px-4 py-4 hover:bg-neutral-50 transition-colors',
        !isLast && 'border-b border-neutral-100'
      )}
    >
      <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-dark" />
      </div>
      <span className="ml-3 text-sm font-medium text-brand-charcoal flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-brand-steel" />
    </Link>
  );
}

export default function AccountPage() {
  const { currentUser, isLoaded, logout } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !currentUser) {
      router.replace('/login?redirect=/account' as any);
    }
  }, [isLoaded, currentUser, router]);

  if (!isLoaded || !currentUser) return null;

  const displayPhone = currentUser.phone
    ? '+91 ' + currentUser.phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10)
    : currentUser.email;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-brand-fog pb-4">
      {/* Account header */}
      <div className="bg-white px-4 py-6 text-center border-b border-neutral-100 shadow-sm">
        <div className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-black text-white">
            {currentUser.name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        <h1 className="text-lg font-bold text-brand-charcoal">{currentUser.name}</h1>
        <p className="text-sm text-brand-slate mt-0.5">{displayPhone}</p>
      </div>

      {/* Menu items */}
      <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
        {MENU_ITEMS.map((item, idx) => (
          <MenuItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            isLast={idx === MENU_ITEMS.length - 1}
          />
        ))}
      </div>

      {/* Log Out */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
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

      <p className="text-center text-xs text-brand-steel mt-8">
        FastGet v1.0.0
      </p>
    </div>
  );
}
