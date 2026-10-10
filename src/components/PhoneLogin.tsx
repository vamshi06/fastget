'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { track } from '@/lib/analytics';

type Step = 'phone' | 'code' | 'profile';

const RESEND_SEC = 30;
// Same check as /api/auth/phone/complete - email is required at phone signup.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone login / signup via a WhatsApp code (one flow for both: an unknown
 * number continues to a short "your name" step). Only rendered when
 * PHONE_LOGIN_ENABLED - see docs/PHONE_LOGIN_SETUP.md.
 */
export function PhoneLogin({ redirect }: { redirect: string | null }) {
  const t = useTranslations('auth.phone');
  const router = useRouter();
  const { setCurrentUser } = useUser();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [proof, setProof] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const digits = phone.replace(/\D/g, '').slice(-10);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.success !== false, data };
  }

  function finishLogin(data: { id: string; name: string; email: string; phone: string; role: string }) {
    setCurrentUser({ id: data.id, name: data.name, email: data.email, phone: data.phone, role: data.role });
    track('logged_in', { method: 'phone' });
    router.push((redirect || '/') as any);
    router.refresh();
  }

  async function sendCode() {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(digits)) { setError(t('invalidNumber')); return; }
    setBusy(true);
    try {
      const { ok, data } = await post('/api/auth/phone/send-otp', { phone: digits });
      if (!ok) { setError(data.error || t('genericError')); if (data.retryAfterSec) setResendIn(data.retryAfterSec); return; }
      setCode('');
      setStep('code');
      setResendIn(RESEND_SEC);
    } catch {
      setError(t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setError(null);
    setBusy(true);
    try {
      const { ok, data } = await post('/api/auth/phone/verify', { phone: digits, code: value });
      if (!ok) { setError(data.error || t('genericError')); return; }
      if (data.needsProfile) { setProof(data.proof); setStep('profile'); return; }
      finishLogin(data);
    } catch {
      setError(t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setError(null);
    setBusy(true);
    try {
      const { ok, data } = await post('/api/auth/phone/complete', { proof, name, email });
      if (!ok) { setError(data.error || t('genericError')); return; }
      finishLogin(data);
    } catch {
      setError(t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 rounded-2xl border border-neutral-200 bg-white text-base text-brand-charcoal focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
  const buttonCls =
    'w-full py-4 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-full text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2';

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-4">
          <p className="text-sm text-brand-slate">{t('subtitle')}</p>
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-brand-graphite mb-1.5">{t('mobileLabel')}</label>
            <div className="flex">
              <span className="px-4 flex items-center rounded-l-2xl border border-r-0 border-neutral-200 bg-brand-fog text-base font-semibold text-brand-charcoal">+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('mobilePlaceholder')}
                className={`${inputCls} rounded-l-none`}
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className={buttonCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t('sending') : t('sendCode')}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="space-y-4">
          <p className="text-sm text-brand-slate">{t('codeSentTo', { phone: digits })}</p>
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            // Lets Android/Chrome offer the code from the notification.
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6 && !busy) verify(v);
            }}
            placeholder="••••••"
            className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={buttonCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t('verifying') : t('verify')}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep('phone'); setError(null); }} className="text-brand-slate font-medium">
              {t('changeNumber')}
            </button>
            {resendIn > 0 ? (
              <span className="text-brand-steel">{t('resendIn', { sec: resendIn })}</span>
            ) : (
              <button type="button" onClick={sendCode} disabled={busy} className="text-brand-primary font-bold">
                {t('resend')}
              </button>
            )}
          </div>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={(e) => { e.preventDefault(); complete(); }} className="space-y-4">
          <div>
            <p className="text-lg font-black text-brand-charcoal">{t('profileTitle')}</p>
            <p className="text-sm text-brand-slate">{t('profileSubtitle')}</p>
          </div>
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-brand-graphite mb-1.5">{t('nameLabel')}</label>
            <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-brand-graphite mb-1.5">{t('emailLabel')}</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} className={inputCls} />
            <p className="text-xs text-brand-steel mt-1.5">{t('emailHint')}</p>
          </div>
          <button type="submit" disabled={busy || name.trim().length < 2 || !EMAIL_RE.test(email.trim())} className={buttonCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t('finishing') : t('finish')}
          </button>
        </form>
      )}
    </div>
  );
}
