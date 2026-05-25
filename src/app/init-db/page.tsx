'use client';

import { useState } from 'react';

export default function InitDBPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/init-db');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Failed to initialize database',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Database Setup</h1>
        <p className="text-gray-600 mb-6">
          Click the button below to initialize the Neon Postgres database schema. This only needs to be done once.
        </p>

        <button
          onClick={handleInitialize}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Initializing...' : 'Initialize Database'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div>
                <h2 className="font-semibold text-green-900 mb-2">✅ Success</h2>
                <p className="text-green-800">{result.message}</p>
                <p className="text-green-700 text-sm mt-2">The database is now ready. You can return to using the app.</p>
              </div>
            ) : (
              <div>
                <h2 className="font-semibold text-red-900 mb-2">❌ Error</h2>
                <p className="text-red-800">{result.error || result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
