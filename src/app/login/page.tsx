'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthHero } from '@/components/AuthHero';
import { PhoneLogin } from '@/components/PhoneLogin';
import { PHONE_LOGIN_ENABLED } from '@/lib/feature-flags';
import { useUser } from '@/components/UserContext';
import { isStaffRoute } from '@/lib/staff-routes';
import { track } from '@/lib/analytics';
import { AuthField, authSubmitClass } from '@/components/AuthField';
import { AlertCircle, Lock, Mail } from 'lucide-react';


function LoginForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths - "//evil.com" or "https://..." would send the user off-site.
  const redirectParam = searchParams.get('redirect');
  const redirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : null;
  const { setCurrentUser } = useUser();

  // Prefilled after sign-up + email verification.
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // With phone login on, the email form is the secondary option.
  const [useEmail, setUseEmail] = useState(!PHONE_LOGIN_ENABLED);

  // When the API returns requiresVerification: true
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (error) track('login_error', { message: error });
  }, [error]);
  useEffect(() => {
    if (unverifiedEmail) track('login_error', { message: 'email_not_verified' });
  }, [unverifiedEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

    if (!email.trim()) { setError(t('errors.emailRequired')); return; }
    if (!password)     { setError(t('errors.passwordRequired')); return; }
    if (!email.includes('@')) { setError(t('common.invalidEmail')); return; }

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
        setError(data.error || t('errors.invalidCredentials'));
        return;
      }

      setCurrentUser({ id: data.id, name: data.name, email: data.email, phone: data.phone, role: data.role });
      track('logged_in', { method: 'email' });
      // Admins sign in here too and land on the admin panel by default. A
      // non-admin is never sent to a staff screen (it would just bounce back here).
      const isAdmin = data.role === 'admin';
      const target = redirect && (isAdmin || !isStaffRoute(redirect))
        ? redirect
        : isAdmin ? '/admin' : '/';
      router.push(target as any);
      router.refresh();
    } catch {
      setError(t('errors.genericLoginError'));
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
      <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
        <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
        <AuthHero title={t('login.checkEmailTitle')} />
        <div className="auth-panel flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col items-center text-center md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:justify-center md:px-14 md:py-10">
          <Mail className="w-12 h-12 text-brand-primary mb-3" />
          <p className="text-sm text-brand-slate max-w-xs">
            {t('login.verifyPrompt', { email: unverifiedEmail })}
          </p>

          <div className="mt-6 w-full max-w-sm space-y-2">
            {resendState === 'sent' ? (
              <p className="text-sm text-green-700 font-semibold">
                ✓ {t('login.resendSent')}
              </p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendState === 'sending'}
                className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors"
              >
                {resendState === 'sending' ? t('resendVerification.submitting') : t('login.resendButton')}
              </button>
            )}

            <button
              onClick={() => {
                setUnverifiedEmail(null);
                setResendState('idle');
                setError(null);
              }}
              className="w-full py-3.5 border border-neutral-200 hover:bg-brand-fog text-brand-charcoal font-semibold rounded-full text-sm transition-colors"
            >
              {t('common.backToLogin')}
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title={tc('login')} />
      <div className="auth-panel flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:justify-center md:px-14 md:py-10">
      {/* Phone login (WhatsApp code) - only when switched on, see
          docs/PHONE_LOGIN_SETUP.md. Otherwise this page is email-only as before. */}
      {PHONE_LOGIN_ENABLED && !useEmail ? (
        <>
          <PhoneLogin redirect={redirect} />
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-xs text-brand-steel">{t('phone.or')}</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>
          <button
            type="button"
            onClick={() => setUseEmail(true)}
            className="w-full py-3.5 border border-neutral-200 hover:bg-brand-fog text-brand-charcoal font-semibold rounded-full text-sm transition-colors"
          >
            {t('phone.useEmail')}
          </button>
        </>
      ) : (
      <>
      {PHONE_LOGIN_ENABLED && (
        <button type="button" onClick={() => setUseEmail(false)} className="self-start mb-4 text-sm font-semibold text-brand-primary">
          ← {t('phone.usePhone')}
        </button>
      )}
      <p className="text-sm text-brand-slate mb-6 md:text-base md:mb-8">{t('login.subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="email"
          type="email"
          autoComplete="email"
          icon={Mail}
          label={t('login.emailLabel')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('login.emailPlaceholder')}
        />

        <AuthField
          id="password"
          type="password"
          autoComplete="current-password"
          icon={Lock}
          label={t('login.passwordLabel')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('login.passwordPlaceholder')}
        />

        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            className="text-xs text-brand-primary hover:text-brand-dark font-semibold transition-colors"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>

        <button type="submit" disabled={isLoading} className={authSubmitClass}>
          {isLoading ? t('login.submitting') : tc('login')}
        </button>
      </form>
      </>
      )}

      <div className="flex-1 min-h-6 md:hidden" />

      <p className="text-center text-sm text-brand-slate pb-2 md:pb-0 md:mt-8">
        {t('login.noAccount')}{' '}
        <Link
          href={redirect && redirect !== '/' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
          className="text-brand-primary font-bold hover:text-brand-dark transition-colors"
        >
          {tc('signup')}
        </Link>
      </p>
      </div>
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
