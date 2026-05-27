'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Lock, Zap, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (token) {
      router.push(`/admin?token=${encodeURIComponent(token)}`);
    } else {
      setError('Please enter an admin token');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2A2A2C 50%, #1C1C1E 100%)' }}
    >
      <div className="absolute inset-0 bg-motion-lines pointer-events-none" />
      <div className="absolute top-0 left-0 w-1 h-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #F5A623, transparent 60%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              Fast<span className="text-brand-primary">Get</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 space-y-6" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
          <div>
            <h1 className="text-2xl font-black text-brand-charcoal">Admin Access</h1>
            <p className="text-brand-slate text-sm mt-1">Secure admin panel — enter your token</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-xs font-semibold text-brand-graphite mb-1.5 uppercase tracking-wide">
                Admin Token
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your admin token"
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm text-brand-charcoal bg-brand-fog
                             focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary focus:bg-white
                             transition-all duration-200"
                />
              </div>
              <p className="text-xs text-brand-steel mt-1.5">
                Set the ADMIN_TOKEN environment variable
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>

          <p className="text-xs text-brand-steel text-center">
            This is a secure admin panel. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
