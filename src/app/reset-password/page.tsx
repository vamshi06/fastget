'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, LockKeyhole, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="flex-1 flex flex-col">
        <AuthHero title="Invalid link" />
        <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 py-10 shadow-xl flex flex-col items-center justify-center text-center">
          <XCircle className="w-14 h-14 text-red-500 mb-4" />
          <p className="text-sm text-brand-slate">
            This password reset link is invalid. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex-1 flex flex-col">
        <AuthHero title="Password reset!" />
        <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-8 py-10 shadow-xl flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
          <p className="text-sm text-brand-slate">
            Your password has been changed successfully. You can now log in.
          </p>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setState('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Reset failed. The link may have expired.');
        setState('error');
        return;
      }

      setState('success');
      // Auto-redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('A network error occurred. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AuthHero title="Set new password" />
      <div className="flex-1 bg-gradient-to-b from-primary-50 via-white to-white rounded-t-3xl -mt-5 relative z-10 px-6 pt-6 pb-6 shadow-xl flex flex-col justify-center">
        <div className="text-center mb-5">
          <LockKeyhole className="w-10 h-10 text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-brand-slate">Choose a strong password of at least 8 characters.</p>
        </div>

        {(error || state === 'error') && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">
              {error || 'Reset failed.'}
              {state === 'error' && (
                <>
                  {' '}
                  <Link href="/forgot-password" className="underline font-semibold">
                    Request a new link.
                  </Link>
                </>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingInput
            label="New Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FloatingInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm disabled:opacity-50 flex items-center justify-center transition-colors mt-1"
          >
            {state === 'loading' ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          <Link href="/login" className="text-brand-primary font-semibold hover:text-brand-dark">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
