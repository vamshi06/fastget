'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, XCircle, Loader2 } from 'lucide-react';

function VerifyResetOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
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
    if (otp.length !== 6) { setErrorMsg('Enter all 6 digits'); setState('error'); return; }

    setState('loading');
    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/reset-password?token=${encodeURIComponent(data.token)}`);
      } else {
        setErrorMsg(data.error || 'Verification failed.');
        setState('error');
      }
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-8 py-10">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-brand-charcoal">Enter reset code</h2>
          <p className="mt-1.5 text-sm text-brand-slate">
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
                           text-brand-charcoal bg-brand-fog focus:outline-none
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
            ) : 'Verify Code'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Didn&apos;t receive a code?{' '}
          <Link href="/forgot-password" className="text-brand-primary font-semibold hover:text-brand-dark">
            Resend
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyResetOtpPage() {
  return (
    <Suspense>
      <VerifyResetOtpContent />
    </Suspense>
  );
}
