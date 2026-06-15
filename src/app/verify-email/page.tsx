'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

type State = 'loading' | 'success' | 'error' | 'no-token';

const REDIRECT_DELAY_MS = 3000;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [state, setState] = useState<State>(token ? 'loading' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);
  const didVerify = useRef(false);

  useEffect(() => {
    if (!token || didVerify.current) return;
    didVerify.current = true;

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setState('success');
        } else {
          setErrorMsg(data.error || 'Verification failed.');
          setState('error');
        }
      })
      .catch(() => {
        setErrorMsg('A network error occurred. Please try again.');
        setState('error');
      });
  }, [token]);

  useEffect(() => {
    if (state !== 'success') return;

    const timer = setTimeout(() => router.push('/login'), REDIRECT_DELAY_MS);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [state, router]);

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-8 py-10 text-center">

        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-brand-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-brand-charcoal">Verifying your email…</h2>
            <p className="mt-2 text-sm text-brand-slate">This will only take a moment.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brand-charcoal">Email verified!</h2>
            <p className="mt-2 text-sm text-brand-slate">
              Your email has been verified successfully. Redirecting to login in {countdown}s…
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
            >
              Go to Login
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brand-charcoal">Verification failed</h2>
            <p className="mt-2 text-sm text-brand-slate">{errorMsg}</p>
            <p className="mt-4 text-sm text-brand-slate">
              Verification links expire after 24 hours.{' '}
              <Link href="/resend-verification" className="text-brand-primary font-semibold hover:text-brand-dark">
                Request a new link
              </Link>
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center py-3 border border-neutral-200 hover:bg-brand-fog text-brand-charcoal font-semibold rounded-full text-sm transition-colors"
            >
              Back to Login
            </Link>
          </>
        )}

        {state === 'no-token' && (
          <>
            <Mail className="w-12 h-12 text-brand-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-brand-charcoal">Invalid link</h2>
            <p className="mt-2 text-sm text-brand-slate">
              No verification token was found. Please use the link from your email, or request a new one.
            </p>
            <Link
              href="/resend-verification"
              className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
            >
              Resend Verification Email
            </Link>
          </>
        )}

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
