'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthHero } from '@/components/AuthHero';
import { AlertCircle } from 'lucide-react';


export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError(t('common.invalidEmail')); return; }
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
      setError(t('common.networkError'));
      setState('idle');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title={t('forgotPassword.heroTitle')} />
      <div className="auth-panel flex-1 bg-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col justify-center md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:px-14 md:py-10">
        <p className="text-sm text-brand-slate mb-6 md:text-base md:mb-8">{t('forgotPassword.subtitle')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-brand-graphite mb-1.5">
              {t('forgotPassword.emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('forgotPassword.emailPlaceholder')}
              className="w-full px-4 py-3.5 rounded-2xl border border-neutral-200 bg-white text-sm text-brand-charcoal focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-4 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
          >
            {state === 'loading' ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate pb-2 md:pb-0 md:mt-8">
          {t('forgotPassword.rememberedIt')}{' '}
          <Link href="/login" className="text-brand-primary font-bold hover:text-brand-dark transition-colors">
            {tc('login')}
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
