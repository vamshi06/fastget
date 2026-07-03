'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ChevronLeft } from 'lucide-react';

function AuthHero({ title }: { title: string }) {
  return (
    <div className="relative h-[38vh] min-h-[240px] flex-shrink-0 md:h-auto md:min-h-[520px] md:w-[45%]">
      <Image
        src="/construction-background.jpg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/60 md:bg-gradient-to-t md:from-black/75 md:via-black/20 md:to-black/5" />
      <Link
        href="/login"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </Link>
      <h1 className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h1>
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
      router.push(`/verify-reset-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`);
    } catch {
      setError('A network error occurred. Please try again.');
      setState('idle');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title="Forgot password?" />
      <div className="flex-1 bg-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:justify-center md:px-14 md:py-10">
        <p className="text-sm text-brand-slate mb-6 md:text-base md:mb-8">Enter your email and we&apos;ll send a 6-digit reset code.</p>

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

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-4 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
          >
            {state === 'loading' ? 'Sending…' : 'Send Code'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate pb-2 md:pb-0 md:mt-8">
          Remembered it?{' '}
          <Link href="/login" className="text-brand-primary font-bold hover:text-brand-dark transition-colors">
            Log In
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
