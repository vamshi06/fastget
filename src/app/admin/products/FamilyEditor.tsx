'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Search, Unlink } from 'lucide-react';

export interface FamilyMemberView {
  productCode: string;
  name: string;
  brand?: string;
  optionLabel: string;
  priceRupees: number;
  status: string;
}


/**
 * One family member: editable size label (saved on blur), links, and
 * "Remove from family". Shared by the edit page and the families page.
 */
export function FamilyMemberRow({
  member,
  current,
  onChanged,
}: {
  member: FamilyMemberView;
  current?: boolean;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState(member.optionLabel);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [removing, setRemoving] = useState(false);

  useEffect(() => setLabel(member.optionLabel), [member.optionLabel]);

  const saveLabel = async () => {
    const next = label.trim();
    if (!next || next === member.optionLabel) { setLabel(member.optionLabel); return; }
    setState('saving');
    const res = await fetch(`/admin/api/families/${encodeURIComponent(member.productCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionLabel: next }),
    }).catch(() => null);
    setState(res?.ok ? 'saved' : 'error');
    if (res?.ok) onChanged();
  };

  const remove = async () => {
    if (!confirm(`Take "${member.name}" out of this family? It becomes a separate product card again.`)) return;
    setRemoving(true);
    await fetch(`/admin/api/families/${encodeURIComponent(member.productCode)}`, { method: 'DELETE' }).catch(() => null);
    setRemoving(false);
    onChanged();
  };

  return (
    <li className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${current ? 'bg-primary-50/60' : ''}`}>
      <div className="w-36">
        <input
          value={label}
          onChange={(e) => { setLabel(e.target.value); setState('idle'); }}
          onBlur={saveLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          maxLength={100}
          aria-label={`Size label for ${member.productCode}`}
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-brand-charcoal focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
        />
        <p className="text-[10px] mt-0.5 h-3 text-brand-steel">
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : state === 'error' ? 'Could not save' : ''}
        </p>
      </div>
      <div className="flex-1 min-w-[160px]">
        <p className="text-sm text-brand-charcoal">
          {member.name}
          {current && <span className="ml-1.5 text-[10px] font-bold uppercase text-brand-dark">(this product)</span>}
          {member.status !== 'active' && (
            <span className="ml-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{member.status} - hidden</span>
          )}
        </p>
        <p className="text-xs text-brand-steel">
          <span className="font-mono">{member.productCode}</span> · ₹{member.priceRupees.toLocaleString('en-IN')}
          {member.brand && <> · {member.brand}</>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!current && (
          <Link href={`/admin/products/${encodeURIComponent(member.productCode)}/edit` as any} className="text-xs font-semibold text-brand-primary hover:underline">
            Edit
          </Link>
        )}
        <button type="button" onClick={remove} disabled={removing}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
          <Unlink className="w-3.5 h-3.5" />
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </li>
  );
}

/** A catalogue search result (from GET /admin/api/products). */
export interface PickedProduct {
  id: string;
  productCode?: string;
  name: string;
  brand?: string;
  price: number;
  status?: string;
  familyId?: string;
  optionLabel?: string;
}

export const pickedCode = (p: PickedProduct) => p.productCode ?? p.id;

/** Default size label for a product: the size in brackets at the end of its name. */
export function labelFromName(name: string): string {
  return /\(([^()]*)\)\s*$/.exec(name)?.[1].trim() || name;
}

/**
 * Search box over the whole catalogue (any status). Each result gets a button
 * that calls onPick. Codes in `excludeCodes` are hidden.
 */
export function ProductPicker({
  label,
  actionLabel,
  excludeCodes = [],
  busyCode,
  onPick,
  autoFocus,
}: {
  label?: string;
  actionLabel: string;
  excludeCodes?: string[];
  busyCode?: string | null;
  onPick: (product: PickedProduct) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/admin/api/products?search=${encodeURIComponent(q)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setResults(d.success ? (d.data.products as PickedProduct[]).slice(0, 10) : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const candidates = results.filter((r) => !excludeCodes.includes(pickedCode(r)));

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-semibold text-brand-graphite uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Search by name, brand or product code"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-brand-fog text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:bg-white"
        />
      </div>
      {query.trim().length >= 2 && !searching && candidates.length === 0 && (
        <p className="text-xs text-brand-steel px-1">No other products match.</p>
      )}
      {candidates.length > 0 && (
        <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 bg-white">
          {candidates.map((r) => {
            const code = pickedCode(r);
            return (
              <li key={code} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-charcoal truncate">{r.name}{r.brand && <span className="text-brand-steel"> · {r.brand}</span>}</p>
                  <p className="text-xs text-brand-steel">
                    <span className="font-mono">{code}</span> · ₹{r.price.toLocaleString('en-IN')}
                    {r.familyId && <span className="ml-1 text-brand-dark">· in a family ({r.optionLabel}) - its other sizes join too</span>}
                  </p>
                </div>
                <button type="button" onClick={() => onPick(r)} disabled={!!busyCode}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" />
                  {busyCode === code ? 'Working…' : actionLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Links `codes` into one family (merging any families they're already in). */
export async function linkCodes(codes: string[], labels?: Record<string, string>): Promise<string | null> {
  const res = await fetch('/admin/api/families', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productCodes: codes, labels }),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return res?.ok && data?.success ? null : (data?.error || 'Could not link these products.');
}

/** Edit page: link another existing product into this product's family. */
function LinkProductSearch({ productCode, memberCodes, onLinked }: { productCode: string; memberCodes: string[]; onLinked: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const link = async (p: PickedProduct) => {
    const other = pickedCode(p);
    setBusy(other);
    setError('');
    const err = await linkCodes([productCode, other]);
    setBusy(null);
    if (err) { setError(err); return; }
    onLinked();
  };

  return (
    <div className="space-y-1">
      <ProductPicker
        label="Link an existing product as another size"
        actionLabel="Link"
        excludeCodes={[productCode, ...memberCodes]}
        busyCode={busy}
        onPick={link}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** "Sizes" section on a product's edit page. */
export function FamilyEditor({ productCode }: { productCode: string }) {
  const [members, setMembers] = useState<FamilyMemberView[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/admin/api/families/${encodeURIComponent(productCode)}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Could not load sizes');
        setMembers(d.data.family?.members ?? []);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load sizes'));
  }, [productCode]);

  useEffect(load, [load]);

  return (
    <section id="sizes" className="card p-6 space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-brand-slate uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> Sizes (variant family)
          </h2>
          <p className="text-xs text-brand-steel mt-1 max-w-md">
            Sizes in one family show as a single product with size options. Each size keeps its own
            price, stock and code. The label is what customers tap, e.g. 18&quot; or 4 Litre.
          </p>
        </div>
        <Link
          href={`/admin/products/new?familyOf=${encodeURIComponent(productCode)}` as any}
          className="btn-secondary text-sm"
        >
          <Plus className="w-4 h-4" /> Add another size
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      ) : members === null ? (
        <p className="text-sm text-brand-steel">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-brand-slate bg-brand-fog rounded-xl px-3 py-2.5">
          This product is on its own (no other sizes linked).
        </p>
      ) : (
        <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
          {members.map((m) => (
            <FamilyMemberRow key={m.productCode} member={m} current={m.productCode === productCode} onChanged={load} />
          ))}
        </ul>
      )}

      {!error && (
        <LinkProductSearch productCode={productCode} memberCodes={(members ?? []).map((m) => m.productCode)} onLinked={load} />
      )}

      <p className="text-xs text-brand-steel">
        Review suggested families for the whole catalogue on the{' '}
        <Link href={'/admin/products/families' as any} className="text-brand-primary font-semibold hover:underline">Size families</Link> page.
      </p>
    </section>
  );
}
