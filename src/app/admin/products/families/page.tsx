'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Link2, Plus, Search, Sparkles, X } from 'lucide-react';
import {
  FamilyMemberRow, FamilyMemberView, PickedProduct, ProductPicker, labelFromName, linkCodes, pickedCode,
} from '../FamilyEditor';

interface Family {
  familyId: string;
  members: FamilyMemberView[];
}

type DraftMember = FamilyMemberView & { familyId?: string };

interface Suggestion {
  title: string;
  members: DraftMember[];
}

const fromPicked = (p: PickedProduct): DraftMember => ({
  productCode: pickedCode(p),
  name: p.name,
  brand: p.brand,
  optionLabel: p.optionLabel || labelFromName(p.name),
  priceRupees: p.price,
  status: p.status ?? 'active',
  familyId: p.familyId,
});

/**
 * Editable list of products about to be linked: tick/untick, size label,
 * remove (for ones added by hand), and a red warning on repeated labels.
 * Shared by suggestion cards and "Create your own group".
 */
function DraftMemberList({
  members, selected, labels, removable, onToggle, onLabel, onRemove,
}: {
  members: DraftMember[];
  selected: Set<string>;
  labels: Record<string, string>;
  removable: Set<string>;
  onToggle: (code: string) => void;
  onLabel: (code: string, label: string) => void;
  onRemove: (code: string) => void;
}) {
  const counts = new Map<string, number>();
  members.forEach((m) => {
    if (!selected.has(m.productCode)) return;
    const key = (labels[m.productCode] || '').trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return (
    <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
      {members.map((m) => {
        const on = selected.has(m.productCode);
        const label = labels[m.productCode] ?? '';
        const dup = on && (counts.get(label.trim().toLowerCase()) ?? 0) > 1;
        return (
          <li key={m.productCode} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${on ? '' : 'opacity-50'}`}>
            <input type="checkbox" checked={on} onChange={() => onToggle(m.productCode)}
              aria-label={`Include ${m.productCode}`} className="w-4 h-4 accent-brand-primary" />
            <div className="w-36">
              <input
                value={label}
                onChange={(e) => onLabel(m.productCode, e.target.value)}
                maxLength={100}
                aria-label={`Size label for ${m.productCode}`}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-semibold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/25 ${dup || (on && !label.trim()) ? 'border-red-400' : 'border-neutral-200'}`}
              />
              {dup && <p className="text-[10px] text-red-600 mt-0.5">Same label twice - make them different</p>}
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm text-brand-charcoal">
                {m.name}
                {m.brand && <span className="text-brand-steel"> · {m.brand}</span>}
                {m.status !== 'active' && (
                  <span className="ml-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{m.status}</span>
                )}
                {m.familyId && <span className="ml-1.5 text-[10px] font-bold uppercase text-brand-dark">already in a family</span>}
              </p>
              <p className="text-xs text-brand-steel"><span className="font-mono">{m.productCode}</span> · ₹{m.priceRupees.toLocaleString('en-IN')}</p>
            </div>
            <Link href={`/admin/products/${encodeURIComponent(m.productCode)}/edit` as any} target="_blank"
              className="text-xs font-semibold text-brand-primary hover:underline">
              Open
            </Link>
            {removable.has(m.productCode) && (
              <button type="button" onClick={() => onRemove(m.productCode)} aria-label={`Remove ${m.productCode}`}
                className="p-1 rounded-lg text-brand-steel hover:text-red-600 hover:bg-red-50">
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Products being prepared for linking - a suggestion, or a group the admin
 * builds by hand. Nothing is saved until "Link".
 */
function DraftGroup({
  title, initial, emptyHint, onLinked, onCancel,
}: {
  title?: string;
  initial: DraftMember[];
  emptyHint?: string;
  onLinked: () => void;
  onCancel?: () => void;
}) {
  const [members, setMembers] = useState<DraftMember[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.map((m) => m.productCode)));
  const [labels, setLabels] = useState<Record<string, string>>(
    () => Object.fromEntries(initial.map((m) => [m.productCode, m.optionLabel])),
  );
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(initial.length === 0);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');

  const addProduct = (p: PickedProduct) => {
    const m = fromPicked(p);
    setMembers((prev) => [...prev, m]);
    setSelected((prev) => new Set(prev).add(m.productCode));
    setLabels((prev) => ({ ...prev, [m.productCode]: m.optionLabel }));
    setAdded((prev) => new Set(prev).add(m.productCode));
  };

  const removeProduct = (code: string) => {
    setMembers((prev) => prev.filter((m) => m.productCode !== code));
    setSelected((prev) => { const n = new Set(prev); n.delete(code); return n; });
  };

  const toggle = (code: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  const link = async () => {
    const codes = members.map((m) => m.productCode).filter((c) => selected.has(c));
    if (codes.length < 2) { setError('Tick at least two products.'); return; }
    if (codes.some((c) => !labels[c]?.trim())) { setError('Every ticked product needs a size label.'); return; }
    setLinking(true);
    setError('');
    const err = await linkCodes(codes, Object.fromEntries(codes.map((c) => [c, labels[c].trim()])));
    setLinking(false);
    if (err) { setError(err); return; }
    onLinked();
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-brand-charcoal">{title || 'New group'}</p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary text-sm py-2">Cancel</button>
          )}
          <button type="button" onClick={link} disabled={linking || selected.size < 2}
            className="btn-primary text-sm py-2 disabled:opacity-50">
            <Link2 className="w-4 h-4" />
            {linking ? 'Linking…' : `Link ${selected.size} as sizes`}
          </button>
        </div>
      </div>

      {members.length > 0 ? (
        <DraftMemberList
          members={members} selected={selected} labels={labels} removable={added}
          onToggle={toggle} onLabel={(c, l) => setLabels((prev) => ({ ...prev, [c]: l }))} onRemove={removeProduct}
        />
      ) : (
        emptyHint && <p className="text-sm text-brand-slate">{emptyHint}</p>
      )}

      {picking ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-3 space-y-2">
          <ProductPicker
            label="Add a product to this group"
            actionLabel="Add"
            excludeCodes={members.map((m) => m.productCode)}
            onPick={addProduct}
            autoFocus={initial.length > 0}
          />
          {initial.length > 0 && (
            <button type="button" onClick={() => setPicking(false)} className="text-xs font-semibold text-brand-slate hover:text-brand-charcoal">
              Done adding
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline">
          <Plus className="w-4 h-4" /> Add a product
        </button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** A linked family: edit labels, remove sizes, link or create more sizes. */
function LinkedFamilyCard({ family, onChanged }: { family: Family; onChanged: () => void }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const first = family.members[0];

  const linkExisting = async (p: PickedProduct) => {
    setBusy(pickedCode(p));
    setError('');
    const err = await linkCodes([first.productCode, pickedCode(p)]);
    setBusy(null);
    if (err) { setError(err); return; }
    setPicking(false);
    onChanged();
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-brand-charcoal">
          {first?.brand && <span className="text-brand-steel font-normal">{first.brand} · </span>}
          {first?.name.replace(/\s*\([^()]*\)\s*$/, '')}
          <span className="ml-2 text-xs font-normal text-brand-steel">{family.members.length} sizes</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPicking((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline">
            <Link2 className="w-4 h-4" /> Link existing product
          </button>
          <Link href={`/admin/products/new?familyOf=${encodeURIComponent(first.productCode)}` as any}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline">
            <Plus className="w-4 h-4" /> Create new size
          </Link>
        </div>
      </div>
      <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
        {family.members.map((m) => <FamilyMemberRow key={m.productCode} member={m} onChanged={onChanged} />)}
      </ul>
      {picking && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-3">
          <ProductPicker
            label="Link an existing product as another size"
            actionLabel="Link"
            excludeCodes={family.members.map((m) => m.productCode)}
            busyCode={busy}
            onPick={linkExisting}
            autoFocus
          />
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'suggested' | 'linked'>('suggested');
  const [filter, setFilter] = useState('');
  // "Create your own group" - a counter so each opened draft starts fresh.
  const [draftKey, setDraftKey] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch('/admin/api/families', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Could not load families');
        setFamilies(d.data.families);
        setSuggestions(d.data.suggestions);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load families'));
  }, []);

  useEffect(load, [load]);

  const q = filter.trim().toLowerCase();
  const matches = useCallback(
    (members: FamilyMemberView[], title = '') =>
      !q || title.toLowerCase().includes(q) ||
      members.some((m) => `${m.name} ${m.brand ?? ''} ${m.productCode}`.toLowerCase().includes(q)),
    [q],
  );
  const shownSuggestions = useMemo(() => suggestions.filter((s) => matches(s.members, s.title)), [suggestions, matches]);
  const shownFamilies = useMemo(() => (families ?? []).filter((f) => matches(f.members)), [families, matches]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal flex items-center gap-2">
            <Layers className="w-6 h-6" /> Size families
          </h1>
          <p className="text-sm text-brand-slate mt-1 max-w-2xl">
            Link sizes of the same item (e.g. Telescopic Channel 12&quot; / 18&quot; / 24&quot;) so customers see one product
            with size options. Each size stays its own product with its own price and stock - linking only changes how
            they&apos;re shown. You can change or undo any link later, here or on a product&apos;s edit page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDraftKey(Date.now())} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Create your own group
          </button>
          <Link href="/admin/products" className="btn-secondary text-sm">← Products</Link>
        </div>
      </div>

      {draftKey !== null && (
        <DraftGroup
          key={draftKey}
          title="Your own group"
          initial={[]}
          emptyHint="Search for each product that's a size of the same item and add it, give each a size label, then link."
          onLinked={() => { setDraftKey(null); setTab('linked'); load(); }}
          onCancel={() => setDraftKey(null)}
        />
      )}

      {error ? (
        <div className="card p-6 text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>
      ) : families === null ? (
        <div className="card p-10 text-center text-sm text-brand-steel">Loading…</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {([
              { key: 'suggested', label: `Suggested (${suggestions.length})`, Icon: Sparkles },
              { key: 'linked', label: `Linked (${families.length})`, Icon: Layers },
            ] as const).map(({ key, label, Icon }) => (
              <button key={key} type="button" onClick={() => setTab(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  tab === key ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary/40'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-steel" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, brand or code"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25" />
            </div>
          </div>

          {tab === 'suggested' ? (
            <div className="space-y-4">
              <p className="text-xs text-brand-steel">
                Found by matching category, brand and name (ignoring the size in brackets). Untick anything that isn&apos;t
                really the same item, use <span className="font-semibold">Add a product</span> for one that was missed,
                check the labels, then link. For items no suggestion covers, use <span className="font-semibold">Create your own group</span>.
              </p>
              {shownSuggestions.length === 0 ? (
                <div className="card p-10 text-center text-sm text-brand-steel">
                  {suggestions.length === 0 ? 'No more suggestions - everything that looks like a family is linked.' : 'Nothing matches the filter.'}
                </div>
              ) : (
                shownSuggestions.map((s) => (
                  <DraftGroup key={s.members.map((m) => m.productCode).join(',')} title={s.title} initial={s.members} onLinked={load} />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {shownFamilies.length === 0 ? (
                <div className="card p-10 text-center text-sm text-brand-steel">
                  {families.length === 0 ? 'No families linked yet - start from the Suggested tab.' : 'Nothing matches the filter.'}
                </div>
              ) : (
                shownFamilies.map((f) => <LinkedFamilyCard key={f.familyId} family={f} onChanged={load} />)
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
