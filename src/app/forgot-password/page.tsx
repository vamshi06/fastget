'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }
    setError('');
    setState('loading');

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      // Always show "sent" regardless of API response (prevent enumeration)
      setState('sent');
    } catch {
      setError('A network error occurred. Please try again.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-8 py-10 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-charcoal">Check your email</h2>
          <p className="mt-2 text-sm text-brand-slate">
            If <span className="font-semibold text-brand-charcoal">{email}</span> is registered,
            you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
          </p>
          <p className="mt-3 text-xs text-brand-steel">
            Don&apos;t see it? Check your spam folder.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-brand-charcoal">Forgot password?</h2>
          <p className="mt-1.5 text-sm text-brand-slate">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
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
          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm disabled:opacity-50 flex items-center justify-center transition-colors mt-1"
          >
            {state === 'loading' ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Remembered it?{' '}
          <Link href="/login" className="text-brand-primary font-semibold hover:text-brand-dark">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
