'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setCurrentUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password)     { setError('Password is required'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Invalid email or password'); return; }
      setCurrentUser({ id: data.id, name: data.name, email: data.email });
      router.push(redirect);
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-fog flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
          {/* Orange accent stripe */}
          <div className="h-1 bg-brand-primary" />

          <div className="p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-brand-charcoal">Welcome Back</h1>
              <p className="text-brand-slate text-sm mt-1">Log in to your account to continue</p>
            </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm text-brand-charcoal bg-brand-fog
                             focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                             transition-all duration-200"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm text-brand-charcoal bg-brand-fog
                             focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                             transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in…' : 'Log In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-brand-slate">
            Don&apos;t have an account?{' '}
            <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-brand-primary font-semibold hover:text-brand-dark transition-colors">
              Sign up
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-neutral-100">
            <p className="text-xs text-brand-steel text-center">
              Demo: Use any credentials you signed up with
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
