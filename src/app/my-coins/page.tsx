'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/components/UserContext';
import { formatCurrency } from '@/lib/utils';
import type { CoinTransaction } from '@/types';
import { Coins, ArrowUpCircle, ArrowDownCircle, LogIn, UserPlus, ChevronRight, Gift } from 'lucide-react';

const REASON_LABELS: Record<CoinTransaction['reason'], string> = {
  order_delivered: 'Earned from delivered order',
  redemption: 'Redeemed at checkout',
  redemption_refund: 'Refunded (order cancelled)',
  admin_adjustment: 'Adjusted by support',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function GuestCoins() {
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <Image src="/construction-background.jpg" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/80" />
      <div className="relative z-10 flex flex-col flex-1 justify-between px-6 pt-10 pb-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Coins</h1>
          <p className="text-sm text-white/80 mt-2 max-w-xs mx-auto leading-relaxed">
            Log in to check your coin balance and redeem them for a discount.
          </p>
        </div>
        <div className="space-y-3 max-w-sm mx-auto w-full">
          <Link
            href={'/login?redirect=/my-coins' as any}
            className="flex items-center justify-center gap-2.5 w-full py-4 bg-brand-primary text-white font-bold rounded-2xl text-base shadow-brand-lg hover:bg-brand-dark transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Log In
          </Link>
          <Link
            href={'/signup?redirect=/my-coins' as any}
            className="flex items-center justify-center gap-2.5 w-full py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl text-base border border-white/25 hover:bg-white/20 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyCoinsPage() {
  const { currentUser, isLoaded: userIsLoaded } = useUser();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    fetch('/api/coins/history', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!userIsLoaded) return null;
  if (!currentUser) return <GuestCoins />;

  return (
    <div className="min-h-screen bg-brand-fog pb-8">
      <div className="flex items-center gap-2 px-4 pt-6 pb-2">
        <Link href="/account" className="text-brand-primary hover:text-brand-dark transition-colors font-medium text-sm">Account</Link>
        <ChevronRight className="w-4 h-4 text-brand-steel" />
        <span className="text-brand-charcoal font-medium text-sm">My Coins</span>
      </div>

      <div className="mx-4 mt-2 bg-brand-primary rounded-2xl p-6 text-white shadow-brand-lg">
        <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wide mb-1">
          <Coins className="w-4 h-4" />
          Coin Balance
        </div>
        <p className="text-4xl font-black">{balance}</p>
        <p className="text-sm text-white/85 mt-1">Worth {formatCurrency(balance)} at checkout</p>
      </div>

      <div className="mx-4 mt-3 flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-2xl p-4">
        <Gift className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-charcoal leading-relaxed">
          Earn 10% of every delivered order back in coins, and redeem them for ₹1 off per coin on a future order. Coins never expire.
        </p>
      </div>

      <div className="mx-4 mt-4">
        <h2 className="text-sm font-bold text-brand-charcoal mb-2 px-1">History</h2>
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 text-center text-sm text-brand-slate">
            Loading…
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 text-center text-sm text-brand-slate">
            No coin activity yet — place an order to start earning.
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 divide-y divide-neutral-100">
            {transactions.map((tx) => {
              const isCredit = tx.amount >= 0;
              const Icon = isCredit ? ArrowUpCircle : ArrowDownCircle;
              return (
                <div key={tx.id} className="flex items-center px-4 py-3.5">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`} />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal truncate">{REASON_LABELS[tx.reason]}</p>
                    <p className="text-xs text-brand-slate">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : ''}{tx.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
