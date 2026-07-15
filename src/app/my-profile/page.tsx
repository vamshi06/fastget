'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ToastContext';
import { FloatingInput } from '@/components/FloatingInput';
import {
  ChevronLeft,
  User,
  Mail,
  LogIn,
  UserPlus,
  Check,
  Pencil,
  X,
} from 'lucide-react';

/* ─── Guest screen ───────────────────────────────────────────────────────── */

function GuestProfile() {
  return (
    <div className="min-h-screen bg-brand-fog flex flex-col">
      <div className="bg-white px-6 pt-12 pb-8 text-center border-b border-neutral-100">
        <h1 className="text-2xl font-black text-brand-charcoal tracking-tight">My Profile</h1>
        <p className="text-sm text-brand-slate mt-2 max-w-xs mx-auto leading-relaxed">
          Log in to view and edit your profile details.
        </p>
      </div>
      <div className="px-4 pb-8 pt-6 space-y-3">
        <Link
          href={'/login?redirect=/my-profile' as any}
          className="flex items-center justify-center gap-2 w-full py-4 bg-brand-primary text-white font-bold rounded-2xl text-base shadow-md hover:bg-brand-dark transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Log In
        </Link>
        <Link
          href={'/signup?redirect=/my-profile' as any}
          className="flex items-center justify-center gap-2 w-full py-4 bg-white text-brand-charcoal font-semibold rounded-2xl text-base border border-neutral-200 shadow-sm hover:border-brand-primary hover:text-brand-primary transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Create an Account
        </Link>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function MyProfilePage() {
  const { currentUser, isLoaded, setCurrentUser } = useUser();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState(currentUser?.phone?.replace(/\D/g, '').slice(-10) ?? '');

  if (!isLoaded) return null;
  if (!currentUser) return <GuestProfile />;

  const startEditing = () => {
    setName(currentUser.name ?? '');
    setPhone(currentUser.phone?.replace(/\D/g, '').slice(-10) ?? '');
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.length !== 10) return;

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setCurrentUser({ ...currentUser, name: data.user.name, phone: data.user.phone });
      setEditing(false);
      showToast('Profile updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/account"
            className="p-2 rounded-xl text-brand-slate hover:text-brand-charcoal hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black text-brand-charcoal">My Profile</h1>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 text-center mb-4">
          <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-2xl font-black text-white">
              {currentUser.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-brand-charcoal">{currentUser.name}</h2>
          <p className="text-sm text-brand-slate mt-0.5">{currentUser.email}</p>
        </div>

        {/* Details / edit form */}
        {editing ? (
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <FloatingInput
              label="Full Name *"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
            <FloatingInput
              label="Phone *"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              maxLength={10}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-brand-charcoal font-semibold text-sm hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-neutral-100">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs text-brand-slate">Full Name</p>
                <p className="text-sm font-medium text-brand-charcoal">{currentUser.name}</p>
              </div>
            </div>

            <div className="flex items-center px-5 py-4 border-b border-neutral-100">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs text-brand-slate">Email</p>
                <p className="text-sm font-medium text-brand-charcoal">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center px-5 py-4">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-brand-primary text-sm font-bold">#</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs text-brand-slate">Phone</p>
                <p className="text-sm font-medium text-brand-charcoal">
                  {currentUser.phone ? `+91 ${currentUser.phone.replace(/\D/g, '').slice(-10)}` : '—'}
                </p>
              </div>
            </div>

            <button
              onClick={startEditing}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-primary-50 text-brand-primary font-semibold text-sm hover:bg-primary-100 transition-colors border-t border-neutral-100"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
