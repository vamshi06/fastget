'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, CheckCircle2, XCircle, Mail, Loader2 } from 'lucide-react';

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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefillEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(prefillEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // Keyboard paste via onChange — distribute digits starting from current box
      const next = [...digits];
      clean.slice(0, 6).split('').forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setDigits(next);
      inputRefs.current[Math.min(index + clean.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    pasted.split('').forEach((d, i) => { if (i < 6) next[i] = d; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setErrorMsg('Please enter a valid email address'); setState('error'); return; }
    if (otp.length !== 6) { setErrorMsg('Enter all 6 digits'); setState('error'); return; }

    setState('loading');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp }),
      });
      const data = await res.json();
      if (data.success) {
        setState('success');
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setErrorMsg(data.error || 'Verification failed.');
        setState('error');
      }
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="flex-1 flex flex-col">
        <AuthHero title="Email verified!" />
        <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 py-10 shadow-xl flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
          <p className="text-sm text-brand-slate">Your account is active. Taking you to login…</p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AuthHero title="Verify your email" />
      <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 pt-6 pb-6 shadow-xl flex flex-col justify-center">
        <div className="text-center mb-5">
          <Mail className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-brand-slate">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-brand-charcoal">{email || 'your email'}</span>
          </p>
        </div>

        {state === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!prefillEmail && (
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-2xl text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          )}

          {/* 6-digit OTP boxes */}
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-11 h-14 text-center text-2xl font-bold border-2 rounded-2xl
                           text-brand-charcoal bg-white focus:outline-none
                           focus:border-brand-primary border-neutral-200 transition-colors"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={state === 'loading' || otp.length !== 6}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm
                       disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {state === 'loading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : 'Verify'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Didn&apos;t receive a code?{' '}
          <Link
            href={`/resend-verification${email ? `?email=${encodeURIComponent(email)}` : ''}` as any}
            className="text-brand-primary font-semibold hover:text-brand-dark"
          >
            Resend
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
