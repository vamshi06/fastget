'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { AlertCircle, Mail } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setCurrentUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7 text-center">
          <Mail className="w-12 h-12 text-brand-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-brand-charcoal">Check your email</h3>
          <p className="mt-2 text-sm text-brand-slate">
            Please verify{' '}
            <span className="font-semibold text-brand-charcoal">{unverifiedEmail}</span>{' '}
            before logging in. Check your inbox (and spam folder) for the verification link.
          </p>

          <div className="mt-5 space-y-2">
            {resendState === 'sent' ? (
              <p className="text-sm text-green-700 font-semibold">
                ✓ New verification email sent!
              </p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendState === 'sending'}
                className="w-full py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm disabled:opacity-50 transition-colors"
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
              className="w-full py-3 border border-neutral-200 hover:bg-brand-fog text-brand-charcoal font-semibold rounded-full text-sm transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7">
        <h3 className="text-2xl font-bold text-brand-charcoal text-center mb-6">Login</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FloatingInput
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-brand-primary hover:text-brand-dark font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm
                       disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-1"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Don&apos;t have an account?{' '}
          <Link
            href={redirect && redirect !== '/' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
            className="text-brand-primary font-semibold hover:text-brand-dark transition-colors"
          >
            Sign up
          </Link>
        </p>
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
