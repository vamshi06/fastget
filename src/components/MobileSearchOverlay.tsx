'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Clock, Search, X, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useBackToClose, useLockBodyScroll } from '@/lib/use-back-to-close';
import { useNativeBackHandler } from '@/lib/native-bridge';
import { Product } from '@/types';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const RECENT_KEY = 'fastget_recent_searches';
const MAX_RECENT = 6;

const CATEGORY_IDS = [
  'civil-materials',
  'plumbing',
  'electrical',
  'carpentry',
  'paints',
  'tools-machines',
  'flooring-ceilings',
  'glass-aluminium',
];

// localStorage can throw (private mode, blocked storage) - recent searches
// are a convenience, so any failure just means "none".
function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Full-screen mobile search, opened from the header's search bar. Replaces
 * the old behaviour of jumping to /catalog the moment the field was focused.
 */
export function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('nav');
  const tCategories = useTranslations('categories');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { close, release } = useBackToClose(open, onClose);
  useLockBodyScroll(open);
  // In the app, Back on a top-level tab exits/returns home natively rather
  // than walking WebView history, so claim Back explicitly while open.
  useNativeBackHandler(open, close);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setRecent(readRecent());
    // Focus after paint so the keyboard opens with the overlay.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(q)}&limit=8&lang=${locale}`,
          { signal: ctrl.signal },
        );
        const json = await res.json();
        if (json.success) setResults(json.data.products as Product[]);
        setLoading(false);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setResults([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, locale]);

  // Leave the overlay by navigating: replace the overlay's history entry so
  // Back from the destination returns to the page the user searched from.
  const navigate = (href: string) => {
    release();
    onClose();
    router.replace(href as any);
  };

  const submitSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    writeRecent(next);
    navigate(`/catalog?q=${encodeURIComponent(q)}`);
  };

  const clearRecent = () => {
    writeRecent([]);
    setRecent([]);
  };

  if (!open) return null;

  const trimmed = query.trim();
  const showResults = trimmed.length >= MIN_CHARS;

  // Portalled to <body>: it's opened from the header, whose backdrop-filter
  // and scroll transform would otherwise pin this fixed overlay to the header.
  return createPortal(
    <div className="md:hidden fixed inset-0 z-[70] bg-white flex flex-col animate-screen-in" role="dialog" aria-modal="true">
      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(query);
        }}
        className="flex items-center gap-2 px-2 py-2 border-b border-neutral-100"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t('closeSearch')}
          className="pressable w-10 h-10 flex items-center justify-center rounded-full text-brand-charcoal"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholderMobile')}
            // 16px stops iOS from zooming the page when the field is focused.
            className="w-full h-10 pl-3 pr-9 bg-brand-fog rounded-xl text-base text-brand-charcoal placeholder:text-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-primary/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label={t('clearSearch')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-brand-steel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {showResults ? (
          loading && results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-brand-slate">{t('searching')}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-brand-slate">{t('noResults', { query: trimmed })}</p>
          ) : (
            <>
              <ul>
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-neutral-50"
                    >
                      <div className="relative w-12 h-12 rounded-xl bg-brand-fog flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-contain p-1" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Search className="w-4 h-4 text-brand-steel" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-brand-charcoal line-clamp-2 leading-snug">{product.name}</p>
                        <p className="text-sm font-bold text-brand-charcoal mt-0.5">{formatCurrency(product.price)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => submitSearch(query)}
                className="w-full flex items-center justify-between px-4 py-4 text-sm font-semibold text-brand-primary border-t border-neutral-100 active:bg-primary-50"
              >
                {t('seeAllResultsFor', { query: trimmed })}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )
        ) : (
          <div className="px-4 py-4 space-y-6">
            {recent.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-brand-charcoal">{t('recentSearches')}</h2>
                  <button type="button" onClick={clearRecent} className="text-xs font-semibold text-brand-primary px-2 py-1">
                    {t('clearRecentSearches')}
                  </button>
                </div>
                <ul>
                  {recent.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => submitSearch(r)}
                        className="w-full flex items-center gap-3 py-2.5 text-left text-sm text-brand-graphite active:bg-neutral-50"
                      >
                        <Clock className="w-4 h-4 text-brand-steel flex-shrink-0" />
                        <span className="truncate">{r}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-sm font-bold text-brand-charcoal mb-3">{t('browseCategories')}</h2>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/catalog?category=${id}`)}
                    className="pressable px-3 py-2 rounded-full border border-neutral-200 text-sm text-brand-graphite"
                  >
                    {tCategories(`${id}.full`)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
