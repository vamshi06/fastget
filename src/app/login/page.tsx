'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/components/UserContext';
import { AlertCircle, ChevronLeft, Eye, EyeOff, Mail } from 'lucide-react';

function AuthHero({ title }: { title: string }) {
  return (
    <div className="relative h-[38vh] min-h-[240px] flex-shrink-0 md:h-auto md:min-h-[560px] md:w-[45%]">
      <Image
        src="/construction-background.jpg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/60 md:bg-gradient-to-t md:from-black/75 md:via-black/20 md:to-black/5" />
      <Link
        href="/"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </Link>
      <h1 className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h1>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setCurrentUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // When the API returns requiresVerification: true
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

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

      if (data.requiresVerification) {
        setUnverifiedEmail(data.email || email.toLowerCase().trim());
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }

      setCurrentUser({ id: data.id, name: data.name, email: data.email, phone: data.phone });
      router.push(redirect as any);
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || resendState !== 'idle') return;
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  // ── Unverified state ──────────────────────────────────────────────────────
  if (unverifiedEmail) {
    return (
      <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
        <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
        <AuthHero title="Check your email" />
        <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col items-center text-center md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:justify-center md:px-14 md:py-10">
          <Mail className="w-12 h-12 text-brand-primary mb-3" />
          <p className="text-sm text-brand-slate max-w-xs">
            Please verify{' '}
            <span className="font-semibold text-brand-charcoal">{unverifiedEmail}</span>{' '}
            before logging in. Check your inbox (and spam folder) for the verification link.
          </p>

          <div className="mt-6 w-full max-w-sm space-y-2">
            {resendState === 'sent' ? (
              <p className="text-sm text-green-700 font-semibold">
                ✓ New verification email sent!
              </p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendState === 'sending'}
                className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend Verification Email'}
              </button>
            )}

            <button
              onClick={() => {
                setUnverifiedEmail(null);
                setResendState('idle');
                setError(null);
              }}
              className="w-full py-3.5 border border-neutral-200 hover:bg-brand-fog text-brand-charcoal font-semibold rounded-full text-sm transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title="Login" />
      <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:justify-center md:px-14 md:py-10">
      <p className="text-sm text-brand-slate mb-6 md:text-base md:mb-8">Hello, Welcome back to our account!</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-brand-graphite mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3.5 rounded-2xl border border-neutral-200 bg-white text-sm text-brand-charcoal focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-brand-graphite mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3.5 pr-11 rounded-2xl border border-neutral-200 bg-white text-sm text-brand-charcoal focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-steel hover:text-brand-charcoal transition-colors"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            className="text-xs text-brand-primary hover:text-brand-dark font-semibold transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Signing in…' : 'Log In'}
        </button>
      </form>

      <div className="flex-1 min-h-6 md:hidden" />

      <p className="text-center text-sm text-brand-slate pb-2 md:pb-0 md:mt-8">
        Don&apos;t Have An Account?{' '}
        <Link
          href={redirect && redirect !== '/' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
          className="text-brand-primary font-bold hover:text-brand-dark transition-colors"
        >
          Sign Up
        </Link>
      </p>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
