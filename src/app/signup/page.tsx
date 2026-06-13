'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Mail } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function SignupForm() {
  const searchParams = useSearchParams();
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
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    if (!formData.name.trim()) { setError('Full name is required'); return; }
    if (!nameRegex.test(formData.name.trim())) { setError('Name must be at least 3 characters and contain only letters'); return; }
    if (!formData.email.includes('@')) { setError('Please enter a valid email address'); return; }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) { setError('Please enter a valid 10-digit phone number'); return; }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }

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
        setError(data.error || 'Signup failed');
        return;
      }

      // New flow: show "check your inbox" screen
      setRegisteredEmail(data.email || formData.email.toLowerCase().trim());
    } catch {
      setError('An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Post-signup: verify email prompt ─────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-8 py-10 text-center">
          <Mail className="w-14 h-14 text-brand-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-brand-charcoal">Account created!</h3>
          <p className="mt-2 text-sm text-brand-slate">
            We&apos;ve sent a verification link to{' '}
            <span className="font-semibold text-brand-charcoal">{registeredEmail}</span>.
            Click the link in the email to activate your account.
          </p>
          <p className="mt-3 text-xs text-brand-steel">
            Didn&apos;t get it? Check your spam folder, or{' '}
            <Link
              href={`/resend-verification?email=${encodeURIComponent(registeredEmail)}`}
              className="text-brand-primary font-semibold hover:text-brand-dark"
            >
              resend the email
            </Link>
            .
          </p>
          <Link
            href={`/login${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}` as any}
            className="mt-6 inline-flex w-full items-center justify-center py-3 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  const fields = [
    { label: 'Full Name',        name: 'name',            type: 'text'     },
    { label: 'Email',            name: 'email',           type: 'email'    },
    { label: 'Phone Number',     name: 'phone',           type: 'tel'      },
    { label: 'Password',         name: 'password',        type: 'password' },
    { label: 'Confirm Password', name: 'confirmPassword', type: 'password' },
  ];

  return (
    <div className="flex-1 bg-brand-fog flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-neutral-100 px-6 pt-6 pb-7">
        <h3 className="text-2xl font-bold text-brand-charcoal text-center mb-6">Create account</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(({ label, name, type }) => (
            <FloatingInput
              key={name}
              label={label}
              name={name}
              type={type}
              value={(formData as any)[name]}
              onChange={handleChange}
            />
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-semibold rounded-full text-sm
                       disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-1"
          >
            {isLoading ? 'Creating Account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-slate">
          Already have an account?{' '}
          <Link
            href={redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
            className="text-brand-primary font-semibold hover:text-brand-dark transition-colors"
          >
            Log in
          </Link>
        </p>
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
