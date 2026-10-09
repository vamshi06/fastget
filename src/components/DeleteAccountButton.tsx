'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2, X } from 'lucide-react';
import { useUser } from './UserContext';
import { cn } from '@/lib/utils';
import { PHONE_LOGIN_ENABLED } from '@/lib/feature-flags';

/**
 * Shared in-app account deletion control (Play Store requires this be
 * reachable from the app, not just the website in a browser). Uses a
 * password-confirm modal instead of window.prompt - the Android WebView
 * wrapper doesn't support window.prompt, only alert/confirm.
 */
export function DeleteAccountButton({ variant = 'card' }: { variant?: 'card' | 'dropdown' }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const tp = useTranslations('auth.phone');
  const { currentUser, deleteAccount, logout } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Phone-signup customers have no password: confirm with a WhatsApp code
  // instead (only when phone login is on - docs/PHONE_LOGIN_SETUP.md).
  const [mode, setMode] = useState<'password' | 'phone'>('password');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  if (!currentUser) return null;

  const sendDeleteCode = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'delete_account' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) setError(data.error || tp('genericError'));
      else setCodeSent(true);
    } catch {
      setError(tp('genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmWithCode = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || tp('genericError')); return; }
      logout();
      setOpen(false);
      router.push('/');
    } catch {
      setError(tp('genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!password) {
      setError(t('deleteAccount.passwordRequiredError'));
      return;
    }
    setSubmitting(true);
    setError('');
    const ok = await deleteAccount(currentUser.id, password);
    setSubmitting(false);
    if (!ok) {
      setError(t('deleteAccount.incorrectPasswordError'));
      return;
    }
    setOpen(false);
    router.push('/');
  };

  const closeModal = () => {
    setOpen(false);
    setPassword('');
    setError('');
    setMode('password');
    setCode('');
    setCodeSent(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center hover:bg-red-50 transition-colors',
          variant === 'card'
            ? 'px-4 py-4'
            : 'gap-3 px-5 py-3.5 text-sm border-b border-neutral-100',
        )}
      >
        {variant === 'card' ? (
          <>
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <span className="ml-3 text-sm font-medium text-red-600 flex-1 text-left">{t('deleteAccount.label')}</span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-600">{t('deleteAccount.label')}</span>
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-brand-charcoal">{t('deleteAccount.modalTitle')}</h2>
              <button onClick={closeModal} aria-label={tc('close')}>
                <X className="w-5 h-5 text-brand-steel" />
              </button>
            </div>
            <p className="text-sm text-brand-slate mb-4">
              {t('deleteAccount.modalMessage')}
            </p>
            {mode === 'password' ? (
              <>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('deleteAccount.passwordPlaceholder')}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                {PHONE_LOGIN_ENABLED && (
                  <button type="button" onClick={() => { setMode('phone'); setError(''); }} className="text-xs font-semibold text-brand-primary mb-2">
                    {tp('deleteViaPhone')}
                  </button>
                )}
              </>
            ) : codeSent ? (
              <>
                <p className="text-xs text-brand-slate mb-2">{tp('deleteCodeSent')}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-center text-lg tracking-[0.4em] font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </>
            ) : null}
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-neutral-200 text-brand-charcoal"
              >
                {tc('cancel')}
              </button>
              {mode === 'phone' && !codeSent ? (
                <button
                  onClick={sendDeleteCode}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand-charcoal text-white disabled:opacity-60"
                >
                  {tp('deleteSendCode')}
                </button>
              ) : (
                <button
                  onClick={mode === 'phone' ? confirmWithCode : handleConfirm}
                  disabled={submitting || (mode === 'phone' && code.length !== 6)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white disabled:opacity-60"
                >
                  {submitting ? tc('deleting') : tc('delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
