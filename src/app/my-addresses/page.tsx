'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/components/ToastContext';
import { FloatingInput } from '@/components/FloatingInput';
import { UserAddress, AddressType } from '@/types';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Briefcase,
  MoreHorizontal,
  LogIn,
  UserPlus,
  ChevronLeft,
  Check,
  X,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const TYPE_ICONS: Record<AddressType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  other: MoreHorizontal,
};

const TYPE_LABELS: Record<AddressType, string> = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

const ADDRESS_TYPES: AddressType[] = ['home', 'work', 'other'];

interface AddressFormState {
  type: AddressType;
  street: string;
  city: string;
  phone: string;
  landmark: string;
  isPrimary: boolean;
}

const EMPTY_FORM: AddressFormState = {
  type: 'home',
  street: '',
  city: '',
  phone: '',
  landmark: '',
  isPrimary: false,
};

/* ─── Guest screen ───────────────────────────────────────────────────────── */

function GuestAddresses() {
  return (
    <div className="min-h-screen bg-brand-fog flex flex-col">
      <div className="bg-white px-6 pt-12 pb-8 text-center border-b border-neutral-100">
        <h1 className="text-2xl font-black text-brand-charcoal tracking-tight">My Addresses</h1>
        <p className="text-sm text-brand-slate mt-2 max-w-xs mx-auto leading-relaxed">
          Log in to save delivery addresses for faster checkout.
        </p>
      </div>
      <div className="px-4 py-6 space-y-3">
        {[
          { Icon: MapPin,     text: 'Save multiple delivery locations'     },
          { Icon: Star,       text: 'Set a default address for quick orders' },
          { Icon: Home,       text: 'Label addresses as Home, Work or Other' },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-neutral-100">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-brand-primary" />
            </div>
            <span className="text-sm font-medium text-brand-charcoal">{text}</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-8 space-y-3">
        <Link
          href={'/login?redirect=/my-addresses' as any}
          className="flex items-center justify-center gap-2 w-full py-4 bg-brand-primary text-white font-bold rounded-2xl text-base shadow-md hover:bg-brand-dark transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Log In
        </Link>
        <Link
          href={'/signup?redirect=/my-addresses' as any}
          className="flex items-center justify-center gap-2 w-full py-4 bg-white text-brand-charcoal font-semibold rounded-2xl text-base border border-neutral-200 shadow-sm hover:border-brand-primary hover:text-brand-primary transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Create an Account
        </Link>
      </div>
    </div>
  );
}

/* ─── Address form (add / edit) ──────────────────────────────────────────── */

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AddressFormState;
  onSave: (form: AddressFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AddressFormState>(initial);
  const set = (k: keyof AddressFormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.street.trim() || !form.city.trim() || !form.phone.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-semibold text-brand-slate uppercase tracking-wide mb-2 block">
          Address Type
        </label>
        <div className="flex gap-2">
          {ADDRESS_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                  form.type === t
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary hover:text-brand-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Street */}
      <FloatingInput
        label="Street Address *"
        name="street"
        value={form.street}
        onChange={(e) => set('street', e.target.value)}
        required
      />

      {/* Landmark */}
      <FloatingInput
        label="Landmark (optional)"
        name="landmark"
        value={form.landmark}
        onChange={(e) => set('landmark', e.target.value)}
      />

      {/* City + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <FloatingInput
          label="City *"
          name="city"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          required
        />
        <FloatingInput
          label="Phone *"
          name="phone"
          value={form.phone}
          
          onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          required
          maxLength={10}
        />
      </div>

      {/* Set as primary */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => set('isPrimary', e.target.checked)}
          className="w-4 h-4 accent-brand-primary rounded"
        />
        <span className="text-sm text-brand-charcoal font-medium">Set as primary address</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
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
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}

/* ─── Address card ───────────────────────────────────────────────────────── */

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetPrimary,
  deleting,
  settingPrimary,
  hasPrimary,
}: {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  deleting: boolean;
  settingPrimary: boolean;
  hasPrimary: boolean;
}) {
  const Icon = TYPE_ICONS[address.type];

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${address.isPrimary ? 'border-brand-primary' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-brand-primary" />
          </div>
          <span className="font-bold text-brand-charcoal text-sm">{TYPE_LABELS[address.type]}</span>
          {address.isPrimary && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-xs font-semibold rounded-full">
              <Star className="w-3 h-3" />
              Primary
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-xl text-brand-slate hover:text-brand-primary hover:bg-primary-50 transition-colors"
            title="Edit address"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 rounded-xl text-brand-slate hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete address"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-brand-slate/40 border-t-brand-slate rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-brand-charcoal text-sm font-medium leading-snug">{address.street}</p>
      {address.landmark && (
        <p className="text-brand-slate text-xs mt-0.5">Near {address.landmark}</p>
      )}
      <p className="text-brand-slate text-sm mt-0.5">{address.city}</p>
      <p className="text-brand-slate text-xs mt-1">{address.phone}</p>

      {!address.isPrimary && (
        <button
          onClick={onSetPrimary}
          disabled={settingPrimary}
          className="mt-3 text-xs font-semibold text-brand-primary hover:underline disabled:opacity-40 flex items-center gap-1"
        >
          <Star className="w-3 h-3" />
          {settingPrimary ? 'Switching…' : hasPrimary ? 'Switch to primary' : 'Set as primary'}
        </button>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function MyAddressesPage() {
  const { currentUser, isLoaded } = useUser();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/addresses?userId=${currentUser.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAddresses(data.addresses);
    } catch {
      showToast('Could not load addresses', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    if (isLoaded && currentUser) fetchAddresses();
  }, [isLoaded, currentUser, fetchAddresses]);

  const handleAdd = async (form: AddressFormState) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, ...form }),
      });
      if (!res.ok) throw new Error();
      await fetchAddresses();
      setShowAddForm(false);
      showToast('Address added successfully', 'success');
    } catch {
      showToast('Failed to add address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string, form: AddressFormState) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      // Handle primary change separately if toggled
      if (form.isPrimary && currentUser) {
        await fetch(`/api/addresses/${id}/set-primary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      }
      await fetchAddresses();
      setEditingId(null);
      showToast('Address updated', 'success');
    } catch {
      showToast('Failed to update address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
      showToast('Address removed', 'success');
    } catch {
      showToast('Failed to delete address', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (id: string) => {
    if (!currentUser) return;
    setSettingPrimaryId(id);
    try {
      const res = await fetch(`/api/addresses/${id}/set-primary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (!res.ok) throw new Error();
      await fetchAddresses();
      showToast('Primary address updated', 'success');
    } catch {
      showToast('Failed to update primary address', 'error');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  if (!isLoaded) return null;
  if (!currentUser) return <GuestAddresses />;

  return (
    <div className="min-h-screen bg-brand-fog py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="p-2 rounded-xl text-brand-slate hover:text-brand-charcoal hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-brand-charcoal">My Addresses</h1>
              <p className="text-sm text-brand-slate mt-0.5">
                {loading ? 'Loading…' : `${addresses.length} saved address${addresses.length !== 1 ? 'es' : ''}`}
              </p>
            </div>
          </div>
          {!showAddForm && (
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white font-semibold text-sm rounded-xl hover:bg-brand-dark transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-brand-charcoal mb-2 px-1">New Address</p>
            <AddressForm
              initial={EMPTY_FORM}
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
              saving={saving}
            />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !addresses.length && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-5 animate-pulse">
                <div className="h-4 bg-neutral-100 rounded w-24 mb-3" />
                <div className="h-3 bg-neutral-100 rounded w-48 mb-2" />
                <div className="h-3 bg-neutral-100 rounded w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !addresses.length && !showAddForm && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-lg font-bold text-brand-charcoal mb-1">No saved addresses</h2>
            <p className="text-sm text-brand-slate mb-6">Add an address to speed up checkout.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-semibold rounded-2xl hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Address
            </button>
          </div>
        )}

        {/* Address list */}
        <div className="space-y-3">
          {addresses.map((addr) =>
            editingId === addr.id ? (
              <div key={addr.id}>
                <p className="text-sm font-semibold text-brand-charcoal mb-2 px-1">Edit Address</p>
                <AddressForm
                  initial={{
                    type: addr.type,
                    street: addr.street,
                    city: addr.city,
                    phone: addr.phone,
                    landmark: addr.landmark ?? '',
                    isPrimary: addr.isPrimary,
                  }}
                  onSave={(form) => handleEdit(addr.id, form)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => { setEditingId(addr.id); setShowAddForm(false); }}
                onDelete={() => setConfirmDeleteId(addr.id)}
                onSetPrimary={() => handleSetPrimary(addr.id)}
                deleting={deletingId === addr.id}
                settingPrimary={settingPrimaryId === addr.id}
                hasPrimary={addresses.some(a => a.isPrimary)}
              />
            )
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-brand-charcoal">Remove address?</h2>
            </div>
            <p className="text-sm text-brand-slate mb-5">This address will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-brand-charcoal font-semibold text-sm hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deletingId ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
