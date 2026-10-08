'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Coins, Plus, Minus, ChevronRight } from 'lucide-react';
import type { CoinTransaction } from '@/types';
import type { UserCoinSummary } from '@/lib/db';

interface FoundUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface CoinsLookupClientProps {
  initialBalances: UserCoinSummary[];
}

const REASON_LABELS: Record<CoinTransaction['reason'], string> = {
  order_delivered: 'Order delivered',
  redemption: 'Redeemed at checkout',
  redemption_refund: 'Redemption refunded',
  admin_adjustment: 'Admin adjustment',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export function CoinsLookupClient({ initialBalances }: CoinsLookupClientProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [user, setUser] = useState<FoundUser | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);

  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  // The adjustment waiting for confirmation (+N or -N).
  const [pendingDelta, setPendingDelta] = useState<number | null>(null);

  const loadBalance = async (userId: string) => {
    const res = await fetch(`/admin/api/coins/${userId}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setBalance(data.balance);
      setTransactions(data.transactions);
    } else {
      setSearchError('Could not load this customer\'s coin history. Please try again.');
    }
  };

  const selectUser = async (found: FoundUser) => {
    setSearchError(null);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustAmount('');
    setAdjustNote('');
    setUser(found);
    await loadBalance(found.id);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setUser(null);
    try {
      const res = await fetch(`/admin/api/coins/lookup?query=${encodeURIComponent(query.trim())}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) {
        setSearchError(data.error || 'No user found');
        return;
      }
      await selectUser(data.user);
    } catch {
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Step 1: validate and open the confirmation dialog.
  const requestAdjust = (sign: 1 | -1) => {
    setAdjustError(null);
    setAdjustSuccess(null);
    const amount = Number(adjustAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setAdjustError('Enter a whole number of coins');
      return;
    }
    if (sign === -1 && amount > balance) {
      setAdjustError(`Can't subtract ${amount} coins - the balance is only ${balance}.`);
      return;
    }
    if (adjustNote.trim().length < 3) {
      setAdjustError('Please give a reason for this adjustment.');
      return;
    }
    setPendingDelta(sign * amount);
  };

  // Step 2: the admin confirmed - apply it.
  const confirmAdjust = async () => {
    if (!user || pendingDelta === null) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/admin/api/coins/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: pendingDelta, note: adjustNote.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        setAdjustError(data.error || 'Failed to adjust balance');
        return;
      }
      setAdjustSuccess(`${pendingDelta > 0 ? 'Added' : 'Subtracted'} ${Math.abs(pendingDelta)} coins. New balance: ${data.balance}.`);
      setAdjustAmount('');
      setAdjustNote('');
      await loadBalance(user.id);
    } catch {
      setAdjustError('Something went wrong. Please try again.');
    } finally {
      setAdjusting(false);
      setPendingDelta(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or phone"
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all"
          />
        </div>
        <button type="submit" disabled={searching} className="btn-primary px-6 py-2.5 disabled:opacity-50">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      {!user && (
        <div className="card overflow-hidden">
          {initialBalances.length === 0 ? (
            <p className="text-sm text-brand-slate p-6">No customers have a coin balance yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {initialBalances.map((row) => (
                <button
                  key={row.userId}
                  type="button"
                  onClick={() => selectUser({ id: row.userId, name: row.name, email: row.email, phone: row.phone })}
                  className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">{row.name}</p>
                    <p className="text-xs text-brand-slate">{row.email} · {row.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-bold text-brand-charcoal">{row.balance}</span>
                    <ChevronRight className="w-4 h-4 text-brand-steel" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {user && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <button
                type="button"
                onClick={() => setUser(null)}
                className="text-xs font-semibold text-brand-primary hover:text-brand-dark transition-colors mb-1"
              >
                ← Back to list
              </button>
              <p className="font-bold text-brand-charcoal">{user.name}</p>
              <p className="text-sm text-brand-slate">{user.email} · {user.phone}</p>
            </div>
            <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5">
              <Coins className="w-5 h-5 text-brand-primary" />
              <span className="text-xl font-black text-brand-charcoal">{balance}</span>
              <span className="text-sm text-brand-slate">coins</span>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-brand-graphite uppercase tracking-wide mb-2">Manual adjustment</p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                min={1}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Amount"
                className="w-32 px-3 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all"
              />
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason (required), e.g. compensation for late delivery"
                maxLength={300}
                className="flex-1 min-w-[220px] px-3 py-2 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all"
              />
              <button
                type="button"
                disabled={adjusting}
                onClick={() => requestAdjust(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <button
                type="button"
                disabled={adjusting || balance <= 0}
                onClick={() => requestAdjust(-1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Minus className="w-4 h-4" /> Subtract
              </button>
            </div>
            {adjustError && <p className="text-sm text-red-600 mt-2">{adjustError}</p>}
            {adjustSuccess && <p className="text-sm text-green-700 mt-2">{adjustSuccess}</p>}
          </div>

          {pendingDelta !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => !adjusting && setPendingDelta(null)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-brand-charcoal">
                    {pendingDelta > 0 ? 'Add' : 'Subtract'} {Math.abs(pendingDelta)} coins?
                  </h2>
                  <p className="text-sm text-brand-slate mt-1">
                    {user.name}&apos;s balance will go from <strong>{balance}</strong> to{' '}
                    <strong>{balance + pendingDelta}</strong>.
                  </p>
                  <p className="text-sm text-brand-slate mt-2">Reason: &ldquo;{adjustNote.trim()}&rdquo;</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingDelta(null)}
                    disabled={adjusting}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-brand-charcoal hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAdjust}
                    disabled={adjusting}
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 ${
                      pendingDelta > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {adjusting ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-brand-graphite uppercase tracking-wide mb-3">History</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-brand-slate">No coin activity yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="text-brand-charcoal font-medium">
                        {REASON_LABELS[tx.reason]}
                        {tx.orderId && (
                          <Link href={`/admin/orders/${tx.orderId}`} className="ml-2 text-xs font-semibold text-brand-primary hover:underline">
                            Order {tx.orderId.slice(0, 8).toUpperCase()}
                          </Link>
                        )}
                      </p>
                      {tx.note && <p className="text-xs text-brand-graphite">&ldquo;{tx.note}&rdquo;</p>}
                      <p className="text-xs text-brand-slate">{formatDate(tx.createdAt)}</p>
                    </div>
                    <span className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
