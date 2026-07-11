'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}

/** Star rating — read-only display when `onChange` is omitted, interactive otherwise. */
export function StarRating({ value, onChange, size = 20, readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const interactive = !readOnly && !!onChange;
  const shown = hovered ?? value;

  return (
    <div className={`flex items-center gap-0.5 ${interactive ? 'cursor-pointer' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(null)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'}
          />
        </button>
      ))}
    </div>
  );
}
