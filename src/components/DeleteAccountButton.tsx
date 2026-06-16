'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { useUser } from './UserContext';
import { cn } from '@/lib/utils';

/**
 * Shared in-app account deletion control (Play Store requires this be
 * reachable from the app, not just the website in a browser). Uses a
 * password-confirm modal instead of window.prompt — the Android WebView
 * wrapper doesn't support window.prompt, only alert/confirm.
 */
export function DeleteAccountButton({ variant = 'card' }: { variant?: 'card' | 'dropdown' }) {
  const { currentUser, deleteAccount } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) return null;

  const handleConfirm = async () => {
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    setSubmitting(true);
    setError('');
    const ok = await deleteAccount(currentUser.id, password);
    setSubmitting(false);
    if (!ok) {
      setError('Incorrect password. Please try again.');
      return;
    }
    setOpen(false);
    router.push('/');
  };

  const closeModal = () => {
    setOpen(false);
    setPassword('');
    setError('');
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
            <span className="ml-3 text-sm font-medium text-red-600 flex-1 text-left">Delete Account</span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-600">Delete Account</span>
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-brand-charcoal">Delete Account</h2>
              <button onClick={closeModal} aria-label="Close">
                <X className="w-5 h-5 text-brand-steel" />
              </button>
            </div>
            <p className="text-sm text-brand-slate mb-4">
              This permanently deletes your account, addresses, and wishlist. This cannot be undone.
              Enter your password to confirm.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-neutral-200 text-brand-charcoal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white disabled:opacity-60"
              >
                {submitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
