'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Package } from 'lucide-react';

function OrderLookupForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const [token, setToken] = useState(initialToken);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      window.location.href = `/order/${token.trim()}`;
    }
  };

  return (
    <div className="min-h-screen bg-brand-fog py-16">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-brand-primary" />
          </div>
          <h1 className="text-2xl font-black text-brand-charcoal mb-2">Track Your Order</h1>
          <p className="text-brand-slate">
            Enter your order token to check the status of your delivery
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
              Order Token
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your order token"
                className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl bg-brand-fog text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white transition-all duration-200"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3">
            Track Order
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-slate">
            Don&apos;t have a token?{' '}
            <Link href="/catalog" className="text-brand-primary font-semibold hover:text-brand-dark transition-colors">
              Place a new order
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-fog flex items-center justify-center text-brand-slate">Loading...</div>}>
      <OrderLookupForm />
    </Suspense>
  );
}
