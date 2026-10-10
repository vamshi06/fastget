'use client';

import { useEffect, useState } from 'react';
import { MAX_QTY_PER_LINE } from './CartContext';

interface QuantityInputProps {
  value: number;
  /** Fewest units allowed (the product's minimum order quantity). */
  min: number;
  onCommit: (quantity: number) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * The number between a quantity stepper's −/+ buttons, made typeable - so
 * ordering 200 bags is one entry instead of 200 taps. Commits on blur or
 * Enter, clamped to [min, MAX_QTY_PER_LINE]; an empty/invalid entry snaps
 * back to the current value.
 */
export function QuantityInput({ value, min, onCommit, ariaLabel, className = '' }: QuantityInputProps) {
  const [draft, setDraft] = useState(String(value));

  // Follow outside changes (the −/+ buttons) while not mid-edit.
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setDraft(String(value));
      return;
    }
    const next = Math.min(MAX_QTY_PER_LINE, Math.max(min, n));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      onFocus={(e) => e.target.select()}
      // Clicks inside a card link must not navigate.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`text-center font-bold text-brand-charcoal bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary/30 rounded-md ${className}`}
    />
  );
}
