'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingInput';

function SignupForm() {
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

      const email = data.email || formData.email.toLowerCase().trim();
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError('An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
