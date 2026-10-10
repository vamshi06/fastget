'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthHero } from '@/components/AuthHero';
import { PHONE_LOGIN_ENABLED } from '@/lib/feature-flags';
import { AuthField, authSubmitClass } from '@/components/AuthField';
import { AlertCircle, Lock, Mail, Phone, User } from 'lucide-react';
import { track } from '@/lib/analytics';


function SignupForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect') || '/';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (error) track('signup_error', { message: error });
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mirrors the server rules (src/lib/validation.ts + utils.ts NAME_REGEX).
    const nameRegex = new RegExp(String.raw`^[\p{L}\p{M}'.\-\s]{2,}$`, 'u');
    if (!formData.name.trim()) { setError(t('errors.nameRequired')); return; }
    if (formData.name.trim().length > 120) { setError(t('errors.nameTooLong')); return; }
    if (!nameRegex.test(formData.name.trim())) { setError(t('errors.nameInvalid')); return; }
    if (!formData.email.includes('@')) { setError(t('common.invalidEmail')); return; }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) { setError(t('errors.phoneInvalid')); return; }
    const pw = formData.password;
    const strongPassword =
      pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
    if (!strongPassword) {
      setError(t('errors.passwordWeak'));
      return;
    }
    if (formData.password !== formData.confirmPassword) { setError(t('errors.passwordMismatch')); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('errors.signupFailed'));
        return;
      }

      track('signed_up', { method: 'email' });
      const email = data.email || formData.email.toLowerCase().trim();
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}${redirect && redirect !== '/' ? `&redirect=${encodeURIComponent(redirect)}` : ''}` as any,
      );
    } catch {
      setError(t('errors.genericSignupError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:items-center md:justify-center md:bg-brand-fog md:py-12 md:px-6">
      <div className="flex-1 flex flex-col md:flex-none md:flex-row md:w-full md:max-w-4xl md:rounded-[2rem] md:shadow-2xl md:overflow-hidden md:bg-white">
      <AuthHero title={tc('signup')} />
      <div className="auth-panel flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-6 shadow-xl flex flex-col md:w-[55%] md:mt-0 md:rounded-none md:shadow-none md:bg-none md:bg-white md:justify-center md:px-14 md:py-10">
      {/* Phone signup happens in the login flow (an unknown number continues
          to a short name step) - only offered when phone login is on. */}
      {PHONE_LOGIN_ENABLED && (
        <Link
          href={redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
          className="mb-4 flex items-center justify-center w-full py-3.5 rounded-full bg-brand-charcoal text-white text-sm font-bold"
        >
          {t('phone.signupWithPhone')}
        </Link>
      )}
      <p className="text-sm text-brand-slate mb-6 md:text-base md:mb-8">{t('signup.subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="name"
          name="name"
          autoComplete="name"
          icon={User}
          label={t('signup.fullNameLabel')}
          value={formData.name}
          onChange={handleChange}
          placeholder={t('signup.fullNamePlaceholder')}
        />

        <AuthField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          icon={Mail}
          label={t('signup.emailLabel')}
          value={formData.email}
          onChange={handleChange}
          placeholder={t('signup.emailPlaceholder')}
        />

        <AuthField
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          icon={Phone}
          label={t('signup.phoneLabel')}
          value={formData.phone}
          onChange={handleChange}
          placeholder={t('signup.phonePlaceholder')}
        />

        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          label={t('signup.passwordLabel')}
          value={formData.password}
          onChange={handleChange}
          placeholder={t('signup.passwordPlaceholder')}
        />

        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          label={t('signup.confirmPasswordLabel')}
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder={t('signup.confirmPasswordPlaceholder')}
        />

        <button type="submit" disabled={isLoading} className={authSubmitClass}>
          {isLoading ? t('signup.submitting') : tc('signup')}
        </button>
      </form>

      <div className="flex-1 min-h-6 md:hidden" />

      <p className="text-center text-sm text-brand-slate pb-2 md:pb-0 md:mt-8">
        {t('signup.haveAccount')}{' '}
        <Link
          href={redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
          className="text-brand-primary font-bold hover:text-brand-dark transition-colors"
        >
          {tc('login')}
        </Link>
      </p>
      </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
