'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { User, Mail, Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setCurrentUser } = useUser();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (formData.password.length < 7) { setError('Password must be at least 7 characters'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Signup failed'); return; }
      setCurrentUser({ id: data.id, name: data.name, email: data.email, phone: data.phone });
      router.push(redirect);
    } catch {
      setError('An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = `w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm text-brand-charcoal bg-brand-fog
                    focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                    transition-all duration-200`;

  return (
    <div className="min-h-screen bg-brand-fog flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div className="h-1 bg-brand-primary" />

          <div className="p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-brand-charcoal">Create Account</h1>
              <p className="text-brand-slate text-sm mt-1">Join FastGet for quick deliveries</p>
            </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', name: 'name', type: 'text', Icon: User, placeholder: 'John Doe' },
              { label: 'Email Address', name: 'email', type: 'email', Icon: Mail, placeholder: 'your@email.com' },
              { label: 'Phone Number', name: 'phone', type: 'tel', Icon: Phone, placeholder: '10-digit mobile number' },
              { label: 'Password', name: 'password', type: 'password', Icon: Lock, placeholder: '••••••••' },
              { label: 'Confirm Password', name: 'confirmPassword', type: 'password', Icon: Lock, placeholder: '••••••••' },
            ].map(({ label, name, type, Icon, placeholder }) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                  <input
                    type={type}
                    name={name}
                    value={(formData as any)[name]}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account…' : 'Create Account'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-brand-slate">
            Already have an account?{' '}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-brand-primary font-semibold hover:text-brand-dark transition-colors">
              Log in
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-neutral-100">
            <p className="text-xs text-brand-steel text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
