'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Mail, CheckCircle2 } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function ResendVerificationForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const router = useRouter();
  const [email, setEmail] = useState(prefillEmail);
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError(t('common.invalidEmail')); return; }
    setError('');
    setState('loading');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(data.error || t('common.networkError'));
        setState('idle');
        return;
      }
      // Redirect back to OTP entry page
      router.push(`/verify-email?email=${encodeURIComponent(email.toLowerCase().trim())}`);
    } catch {
      setError(t('common.networkError'));
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-8 py-10 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-charcoal">{t('resendVerification.checkInboxTitle')}</h2>
          <p className="mt-2 text-sm text-brand-slate">
            {t('resendVerification.checkInboxMessage', { email })}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            {t('common.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7">
        <div className="text-center mb-6">
          <Mail className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-brand-charcoal">{t('resendVerification.heading')}</h2>
          <p className="mt-1.5 text-sm text-brand-slate">
            {t('resendVerification.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingInput
            label={t('resendVerification.emailLabel')}
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
            {state === 'loading' ? t('resendVerification.submitting') : t('resendVerification.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          {t('resendVerification.alreadyVerified')}{' '}
          <Link href="/login" className="text-brand-primary font-semibold hover:text-brand-dark">
            {tc('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense>
      <ResendVerificationForm />
    </Suspense>
  );
}
