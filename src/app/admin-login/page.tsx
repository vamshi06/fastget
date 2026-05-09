'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Redirect to admin with token as query param
    if (token) {
      router.push(`/admin?token=${encodeURIComponent(token)}`);
    } else {
      setError('Please enter an admin token');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FastGet Admin</h1>
            <p className="text-gray-600 mt-2">Secure admin access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your admin token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set the ADMIN_TOKEN environment variable
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            This is a secure admin panel. Use your admin token to log in.
          </p>
        </div>
      </div>
    </div>
  );
}
