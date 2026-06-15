'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading'>('idle');
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
      // Always navigate regardless of API response (prevent enumeration)
      router.push(`/verify-reset-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`);
    } catch {
      setError('A network error occurred. Please try again.');
      setState('idle');
    }
  };

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-brand-charcoal">Forgot password?</h2>
          <p className="mt-1.5 text-sm text-brand-slate">
            Enter your email and we&apos;ll send a 6-digit reset code.
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
            {state === 'loading' ? 'Sending…' : 'Send Code'}
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
