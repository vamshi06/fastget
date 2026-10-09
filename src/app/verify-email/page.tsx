'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthHero } from '@/components/AuthHero';
import { CheckCircle2, XCircle, Mail, Loader2 } from 'lucide-react';


function VerifyEmailContent() {
  const t = useTranslations('auth');
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
      // Keyboard paste via onChange - distribute digits starting from current box
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
    if (!email.includes('@')) { setErrorMsg(t('common.invalidEmail')); setState('error'); return; }
    if (otp.length !== 6) { setErrorMsg(t('common.otpIncomplete')); setState('error'); return; }

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
        setErrorMsg(data.error || t('common.verificationFailed'));
        setState('error');
      }
    } catch {
      setErrorMsg(t('common.networkError'));
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
        <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
        <AuthHero title={t('verifyEmail.heroTitle')} />
        <div className="auth-panel flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 py-10 shadow-xl flex flex-col items-center justify-center text-center md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:px-14 md:py-10">
          <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
          <p className="text-sm text-brand-slate">{t('verifyEmail.successMessage')}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            {t('common.goToLogin')}
          </Link>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title={t('verifyEmail.heroTitle')} />
      <div className="auth-panel flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 pt-6 pb-6 shadow-xl flex flex-col justify-center md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:px-14 md:py-10">
        <div className="text-center mb-5">
          <Mail className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-brand-slate">
            {t('common.sentCodeTo')}{' '}
            <span className="font-semibold text-brand-charcoal">{email || t('common.yourEmailFallback')}</span>
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
              placeholder={t('verifyEmail.emailPlaceholder')}
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
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.verifying')}</>
            ) : t('common.verify')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          {t('common.didntReceiveCode')}{' '}
          <Link
            href={`/resend-verification${email ? `?email=${encodeURIComponent(email)}` : ''}` as any}
            className="text-brand-primary font-semibold hover:text-brand-dark"
          >
            {t('common.resend')}
          </Link>
        </p>
      </div>
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
