'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, KeyRound } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function AuthHero({ title }: { title: string }) {
  return (
    <div className="relative h-[28vh] min-h-[180px] flex-shrink-0">
      <Image
        src="/construction-background.jpg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/60" />
      <Link
        href="/login"
        className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </Link>
      <h1 className="absolute bottom-6 left-6 text-2xl font-black text-white tracking-tight">{title}</h1>
    </div>
  );
}

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
    <div className="flex-1 flex flex-col">
      <AuthHero title="Forgot password?" />
      <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-6 pb-6 shadow-xl flex flex-col justify-center">
        <div className="text-center mb-5">
          <p className="text-sm text-brand-slate">
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
