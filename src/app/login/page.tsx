'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { AlertCircle } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setCurrentUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password)     { setError('Password is required'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Invalid email or password'); return; }
      setCurrentUser({ id: data.id, name: data.name, email: data.email, phone: data.phone });
      router.push(redirect as any);
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-12">
      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-7 pb-7">
        <h3 className="text-2xl font-bold text-brand-charcoal text-center mb-6">
          Login
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FloatingInput
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm
                       disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-1"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Don&apos;t have an account?{' '}
          <Link
            href={redirect && redirect !== '/' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
            className="text-brand-primary font-semibold hover:text-brand-dark transition-colors"
          >
            Sign up
          </Link>
        </p>
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
