'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { ImageUrlPreview } from '@/components/ImageUrlPreview';
import type { HomeBanner } from '@/lib/banners';

type FormState = {
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: string;
  isActive: boolean;
  startsAt: string; // datetime-local value, local time
  endsAt: string;
};

const EMPTY_FORM: FormState = {
  imageUrl: '', linkUrl: '', altText: '', sortOrder: '1', isActive: true, startsAt: '', endsAt: '',
};

// ISO <-> <input type="datetime-local"> (which is in the admin's local time).
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

function statusOf(b: HomeBanner): { label: string; className: string } {
  const now = Date.now();
  if (!b.isActive) return { label: 'Hidden', className: 'bg-neutral-100 text-brand-slate' };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: `Starts ${formatWhen(b.startsAt)}`, className: 'bg-amber-100 text-amber-800' };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { label: 'Ended', className: 'bg-neutral-100 text-brand-slate' };
  return { label: b.endsAt ? `Live until ${formatWhen(b.endsAt)}` : 'Live', className: 'bg-green-100 text-green-800' };
}

export function BannersManager({ initialBanners }: { initialBanners: HomeBanner[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = (f: FormState) => ({
    imageUrl: f.imageUrl,
    linkUrl: f.linkUrl,
    altText: f.altText,
    sortOrder: parseInt(f.sortOrder, 10) || 0,
    isActive: f.isActive,
    startsAt: fromLocalInput(f.startsAt),
    endsAt: fromLocalInput(f.endsAt),
  });

  const fromBanner = (b: HomeBanner): FormState => ({
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl ?? '',
    altText: b.altText,
    sortOrder: String(b.sortOrder),
    isActive: b.isActive,
    startsAt: toLocalInput(b.startsAt),
    endsAt: toLocalInput(b.endsAt),
  });

  async function request(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong');
    return data.data as HomeBanner | undefined;
  }

  const sortList = (list: HomeBanner[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        const created = await request('/admin/api/banners', 'POST', payload(form));
        if (created) setBanners((list) => sortList([...list, created]));
      } else if (editingId) {
        const updated = await request(`/admin/api/banners/${editingId}`, 'PUT', payload(form));
        if (updated) setBanners((list) => sortList(list.map((b) => (b.id === updated.id ? updated : b))));
      }
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b: HomeBanner) => {
    setBusyId(b.id);
    setError(null);
    try {
      const updated = await request(`/admin/api/banners/${b.id}`, 'PUT', { ...payload(fromBanner(b)), isActive: !b.isActive });
      if (updated) setBanners((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (b: HomeBanner) => {
    if (!window.confirm('Delete this banner? This cannot be undone.')) return;
    setBusyId(b.id);
    setError(null);
    try {
      await request(`/admin/api/banners/${b.id}`, 'DELETE');
      setBanners((list) => list.filter((x) => x.id !== b.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary';

  return (
    <div className="space-y-4">
      {error && <div className="card p-3 text-sm text-red-700 bg-red-50 border-red-100">{error}</div>}

      {editingId ? (
        <div className="card p-5 space-y-4">
          <h2 className="text-lg font-bold text-brand-charcoal">{editingId === 'new' ? 'Add banner' : 'Edit banner'}</h2>

          <div>
            <label className="block text-xs font-semibold text-brand-graphite mb-1">Image URL *</label>
            <input className={inputCls} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
            <p className="text-xs text-brand-steel mt-1">Wide image, 2:1 (e.g. 1200 × 600 px). Keep text large - it&apos;s shown on phones.</p>
            <ImageUrlPreview url={form.imageUrl} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1">Opens (optional)</label>
              <input className={inputCls} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="/catalog?category=paints" />
              <p className="text-xs text-brand-steel mt-1">A page in the app, starting with /. Leave empty for no link.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1">Description (for screen readers)</label>
              <input className={inputCls} value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} placeholder="5% cashback on orders above ₹1 lakh" maxLength={200} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1">Position in carousel</label>
              <input type="number" min={1} className={inputCls} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              <p className="text-xs text-brand-steel mt-1">1 = first slide, 2 = second… Same number: oldest shows first.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1">Show from (optional)</label>
              <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-graphite mb-1">Show until (optional)</label>
              <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-graphite cursor-pointer select-none">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand-primary" />
            Visible
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving…' : 'Save banner'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setError(null); }} disabled={saving} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId('new'); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add banner
        </button>
      )}

      {banners.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">
          No banners yet - the home screen is showing the built-in text banner.
        </div>
      ) : (
        <ul className="space-y-3">
          {banners.map((b) => {
            const status = statusOf(b);
            return (
              <li key={b.id} className="card p-3 flex items-center gap-4">
                <div className="w-40 aspect-[2/1] rounded-lg bg-brand-fog overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, preview only */}
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-5 h-5 text-brand-steel" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                  <p className="text-sm font-medium text-brand-charcoal truncate mt-1">{b.altText || 'No description'}</p>
                  <p className="text-xs text-brand-slate truncate">
                    Position {b.sortOrder} · {b.linkUrl ? `Opens ${b.linkUrl}` : 'No link'}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" title="Edit" onClick={() => { setForm(fromBanner(b)); setEditingId(b.id); }} className="p-2 rounded-lg hover:bg-neutral-100 text-brand-graphite">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" title={b.isActive ? 'Hide' : 'Show'} onClick={() => handleToggle(b)} disabled={busyId === b.id} className="p-2 rounded-lg hover:bg-neutral-100 text-brand-graphite disabled:opacity-40">
                    {b.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button type="button" title="Delete" onClick={() => handleDelete(b)} disabled={busyId === b.id} className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
